#!/usr/bin/env node
/**
 * 후보 장소 Import (P0 #14 · T-13 · 결정 D-05·D-06·D-23)
 *
 * 원본 파일의 장소를 `Place` 테이블에 **후보**(`visibility = DRAFT`)로 넣는다.
 * 별도 후보 모델을 만들지 않는다(D-05). 조건(`PlaceCondition`)과 검증(`Verification`)은
 * 만들지 않는다 — Import는 조건을 **추측하지 않는다**.
 *
 * 사용자 조회는 `visibility = VISIBLE` **그리고** 검증 이력 존재를 모두 요구하므로
 * (`lib/places/queries.ts`의 `PUBLIC_PLACE_WHERE`), 후보는 두 조건 모두에서 걸러진다.
 *
 * 실행
 *   npm run import:places -- --file ./data/tour-api/import-....json --validate-only
 *   npm run import:places -- --file ./data/tour-api/import-....json
 *   npm run import:places -- --file ./data/tour-api/import-....json --commit
 *
 * **세 가지는 서로 다르다.**
 *   `--validate-only`  DB·API에 **접속하지 않는다.** 파일 형식과 검토 상태만 본다.
 *   (기본, dry-run)    **실제 DB에 접속해** INSERT한 뒤 ROLLBACK한다. 제약 위반을 미리 잡는다.
 *   `--commit`         실제로 쓴다.
 * 이 저장소는 운영 Supabase가 하나뿐이라 실수로 쓰면 되돌릴 곳이 없다.
 *
 * **검토 메타데이터가 없으면 DB에 붙지 않는다**(D-23). 등록용 배열 옆에 같은 이름의
 * `.meta.json`이 있어야 하고, 사람이 `scripts/review-tour-import.cjs`로 기록한
 * `REVIEWED` 상태여야 한다. 메타를 빼서 검토를 건너뛸 수 없다.
 *
 * 입력 형식 — 객체 배열
 *   {
 *     "tourApiId": "string (필수, 중복 판정 기준)",
 *     "nameKr":    "string (필수)",
 *     "nameEn":    "string (선택)",
 *     "category":  "RESTAURANT | CAFE | TRAVEL | ETC (필수)",
 *     "address":   "string (필수)",
 *     "lat":        36.35,   // 필수. 한국 범위 33~43
 *     "lng":        127.38,  // 필수. 한국 범위 124~132
 *     "phone":       "string (선택)",
 *     "website":     "string (선택)",
 *     "thumbnailUrl":"string (선택)"
 *   }
 *
 * 원본이 TourAPI든 수집 파일이든 이 형식으로 맞춰서 넣는다(기획서 v3 §8-1 —
 * `TourAPI 또는 원본 데이터`). 스크립트는 원본 API 계약을 알지 못한다.
 */

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import crypto from "node:crypto";

import { loadReviewedImport, MetaError, recordPath } from "./tour-import-meta.mjs";

export const CATEGORIES = new Set(["RESTAURANT", "CAFE", "TRAVEL", "ETC"]);
export const PARKING_VALUES = new Set(["AVAILABLE", "UNAVAILABLE", "UNKNOWN"]);
/** 관리자 폼과 같은 한도. 여기서 넓히지 않는다. */
const DESCRIPTION_MAX_LENGTH = 2000;
const USAGE_GUIDE_MAX_LENGTH = 2000;
const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * 요일별 운영시간. `operatingHoursSchema`와 같은 규칙을 옮겨 적는다
 * (이 스크립트는 순수 node라 TypeScript 모듈을 가져올 수 없다).
 * 키가 빠지거나 `HH:MM`이 아니면 받지 않는다 — 화면이 읽을 수 없는 값이 DB에 남는다.
 */
function isOperatingHours(value) {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  if (keys.length !== DAY_KEYS.length || !DAY_KEYS.every((day) => keys.includes(day))) return false;
  return DAY_KEYS.every((day) => {
    const entry = value[day];
    if (entry === null) return true;
    if (entry == null || typeof entry !== "object") return false;
    if (Object.keys(entry).sort().join() !== "close,open") return false;
    return (
      TIME_PATTERN.test(entry.open) && TIME_PATTERN.test(entry.close) && entry.open < entry.close
    );
  });
}
// 관리자 폼(`lib/validation/place.ts`)과 같은 한국 범위. 여기서 넓히지 않는다.
const LAT_MIN = 33, LAT_MAX = 43;
const LNG_MIN = 124, LNG_MAX = 132;

const IMAGE_LICENSE_TYPES = new Set([
  "KOGL_TYPE1",
  "KOGL_TYPE2",
  "KOGL_TYPE3",
  "KOGL_TYPE4",
  "UNKNOWN",
]);

/**
 * 이 스크립트는 관리자 폼을 거치지 않고 `Place`에 **직접 쓴다.** 그래서 zod 스키마의
 * URL 검사가 적용되지 않는다. `website`·`thumbnailUrl`은 사용자 화면에서 `href`와
 * 이미지 주소로 쓰이므로 여기서도 같은 규칙(http/https + 도메인 호스트)을 건다.
 *
 * 이 스크립트는 순수 node로 돌아 TypeScript 모듈을 가져올 수 없다. 그래서 규칙을
 * 옮겨 적되, `src/lib/places/import-validation.test.ts`가 `lib/validation/url.ts`와
 * 같은 답을 내는지 확인해 두 곳이 갈라지지 않게 막는다.
 */
export function isHttpUrl(value) {
  let url;
  try {
    url = new URL(String(value).trim());
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  // IP 주소·`localhost`·밑줄이 든 호스트는 공개 홈페이지 주소가 아니다.
  // zod의 `regexes.domain`(node_modules/zod/v4/core/regexes.js)과 같은 식이다.
  return /^([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/.test(url.hostname);
}

function parseArgs(argv) {
  const args = { file: null, commit: false, validateOnly: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--file") args.file = argv[i + 1];
    else if (argv[i] === "--commit") args.commit = true;
    else if (argv[i] === "--validate-only") args.validateOnly = true;
  }
  return args;
}

function readDatabaseUrl() {
  // 격리 DB로 흐름을 확인할 때만 쓰는 **명시적** 우회로다. 이름을 `DATABASE_URL`과 다르게
  // 두어, 앱이 쓰는 변수가 실수로 등록 대상을 바꾸지 못하게 한다.
  const override = process.env.IMPORT_DATABASE_URL?.trim();
  if (override) {
    console.log("IMPORT_DATABASE_URL이 설정되어 있어 .env.local의 DATABASE_URL 대신 그 값을 씁니다.");
    return override;
  }
  const envPath = path.resolve(".env.local");
  if (!fs.existsSync(envPath)) {
    throw new Error(".env.local이 없습니다. DATABASE_URL이 필요합니다.");
  }
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const key of ["DATABASE_URL", "DIRECT_URL"]) {
    const line = lines.find((l) => l.startsWith(`${key}=`));
    if (line) return line.slice(key.length + 1).replace(/^["']|["']$/g, "").trim();
  }
  throw new Error(".env.local에서 DATABASE_URL을 찾지 못했습니다.");
}

/** 한 항목이 후보로 들어갈 수 있는지. 통과하지 못하면 이유를 돌려준다. */
export function validate(item, index) {
  const where = `#${index}${item?.nameKr ? ` (${item.nameKr})` : ""}`;
  if (!item || typeof item !== "object") return `${where}: 객체가 아닙니다`;
  if (!item.tourApiId) return `${where}: tourApiId 없음`;
  if (!item.nameKr) return `${where}: nameKr 없음`;
  if (!item.address) return `${where}: address 없음`;
  if (!CATEGORIES.has(item.category)) {
    return `${where}: category가 ${[...CATEGORIES].join("/")} 중 하나가 아닙니다 (${item.category})`;
  }
  const lat = Number(item.lat), lng = Number(item.lng);
  // 좌표가 없으면 건너뛴다. 기본 좌표나 더미 값을 넣지 않는다(명세서 §12-2).
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return `${where}: 좌표 없음`;
  if (lat < LAT_MIN || lat > LAT_MAX) return `${where}: 위도가 한국 범위 밖 (${lat})`;
  if (lng < LNG_MIN || lng > LNG_MAX) return `${where}: 경도가 한국 범위 밖 (${lng})`;
  for (const key of ["website", "thumbnailUrl"]) {
    const value = item[key];
    if (value == null || value === "") continue;
    if (!isHttpUrl(value)) return `${where}: ${key}가 http/https 주소가 아닙니다`;
  }
  // 관광공사 원문에서 온 값들. 폼과 같은 한도를 걸어 화면이 감당 못 할 값이 DB에 남지 않게 한다.
  for (const [key, limit] of [
    ["descriptionKr", DESCRIPTION_MAX_LENGTH],
    ["descriptionEn", DESCRIPTION_MAX_LENGTH],
    ["usageGuideKr", USAGE_GUIDE_MAX_LENGTH],
    ["usageGuideEn", USAGE_GUIDE_MAX_LENGTH],
  ]) {
    const value = item[key];
    if (value == null || value === "") continue;
    if (typeof value !== "string") return `${where}: ${key}가 문자열이 아닙니다`;
    if (value.length > limit) return `${where}: ${key}가 ${limit}자를 넘습니다 (${value.length}자)`;
  }
  if (item.parking != null && !PARKING_VALUES.has(item.parking)) {
    return `${where}: parking이 ${[...PARKING_VALUES].join("/")} 중 하나가 아닙니다 (${item.parking})`;
  }
  if (item.hours != null && !isOperatingHours(item.hours)) {
    return `${where}: hours가 요일별 HH:MM 형식이 아닙니다`;
  }
  return null;
}

/**
 * 메타의 이미지 정보 → `PlaceImageAttribution` 행 (D-22).
 *
 * **검토 기록은 만들지 않는다.** `reviewedAt`은 NULL이고, 그래서 공개 화면에 이미지가
 * 나가지 않는다. 사람이 관리자 화면에서 확인한 뒤에야 채워진다.
 * 이미지 주소가 후보의 `thumbnailUrl`과 다르면 이 메타는 그 이미지를 설명하지 않으므로
 * 행을 만들지 않는다.
 */
export function attributionRowFor(item, metaItem) {
  const image = metaItem?.image;
  if (!image?.imageUrl) return null;
  if (!item.thumbnailUrl || image.imageUrl !== item.thumbnailUrl) return null;
  if (!image.provider || !image.sourceUrl) return null;
  if (!isHttpUrl(image.sourceUrl)) return null;

  const licenseType = IMAGE_LICENSE_TYPES.has(image.licenseType) ? image.licenseType : "UNKNOWN";
  const fetchedAt = metaItem?.source?.fetchedAt;
  return {
    imageUrl: image.imageUrl,
    provider: image.provider,
    // 확인되지 않은 값은 NULL로 둔다. 기관명으로 저작권자를 대신 채우지 않는다.
    copyrightHolder: image.copyrightHolder ?? null,
    workTitle: image.workTitle ?? null,
    createdYear: Number.isInteger(image.createdYear) ? image.createdYear : null,
    sourceUrl: image.sourceUrl,
    licenseType,
    licenseUrl: image.licenseUrl && isHttpUrl(image.licenseUrl) ? image.licenseUrl : null,
    preparationId: null,
    sourceSnapshotSha256: metaItem?.source?.sha256 ?? null,
    // 수집 시각이다. 정책을 확인한 날이 아니다.
    sourceFetchedAt: fetchedAt ? new Date(fetchedAt) : null,
  };
}

function reportLoaded(loaded, projectRoot) {
  console.log(`등록용 파일 ${recordPath(projectRoot, loaded.importPath)} · ${loaded.items.length}건`);
  console.log(`검토 메타     ${recordPath(projectRoot, loaded.metaPath)}`);
  console.log("");
  if (loaded.issues.length > 0) {
    console.log("형식 검증: 실패");
    for (const issue of loaded.issues) console.log(`  - ${issue}`);
    return false;
  }
  console.log("형식 검증: 통과 (파일·해시·건수·콘텐츠 ID 대응)");

  if (loaded.reviewIssues.length > 0) {
    console.log("사람 검토: 대기");
    for (const issue of loaded.reviewIssues) console.log(`  - ${issue}`);
    return false;
  }
  const review = loaded.meta.review;
  console.log(`사람 검토: 완료 (${review.reviewedBy} · ${review.reviewedAt})`);
  return true;
}

async function main() {
  const { file, commit, validateOnly } = parseArgs(process.argv.slice(2));
  const projectRoot = process.cwd();

  if (!file) {
    console.error(
      "사용법: npm run import:places -- --file <경로> [--validate-only | --commit]",
    );
    process.exitCode = 1;
    return;
  }
  if (validateOnly && commit) {
    console.error("--validate-only 와 --commit 은 함께 쓸 수 없습니다.");
    process.exitCode = 1;
    return;
  }

  let loaded;
  try {
    loaded = await loadReviewedImport(file, projectRoot);
  } catch (error) {
    console.error(error instanceof MetaError ? error.message : String(error?.message ?? error));
    process.exitCode = 1;
    return;
  }

  const ready = reportLoaded(loaded, projectRoot);

  // 항목 검증은 DB 없이 할 수 있다. 검토 상태와 무관하게 무엇이 잘못됐는지 먼저 보여 준다.
  const items = loaded.items;
  const itemFailures = [];
  for (let i = 0; i < items.length; i += 1) {
    const reason = validate(items[i], i);
    if (reason) itemFailures.push(reason);
  }
  console.log("");
  console.log(`항목 검증: ${items.length - itemFailures.length}건 통과 · ${itemFailures.length}건 실패`);
  for (const reason of itemFailures) console.log(`  - ${reason}`);

  if (validateOnly) {
    console.log("");
    console.log("DB와 외부 API에 접속하지 않았습니다.");
    if (!ready) {
      console.log("아직 등록할 수 없습니다. 위 항목을 해결한 뒤 검토를 기록하세요.");
      process.exitCode = 1;
    } else if (itemFailures.length > 0) {
      console.log("검토는 끝났지만 통과하지 못한 항목이 있습니다.");
      process.exitCode = 1;
    } else {
      console.log("등록할 수 있는 상태입니다.");
    }
    return;
  }

  if (!ready) {
    console.log("");
    console.error("검토를 마치지 않은 파일은 DB에 붙지 않습니다. scripts/review-tour-import.cjs 로 검토를 기록하세요.");
    process.exitCode = 1;
    return;
  }

  // 여기서부터 DB에 접속한다. `--validate-only`는 이 지점에 오지 않는다.
  const { default: pg } = await import("pg");

  const metaById = new Map(loaded.meta.items.map((item) => [String(item.tourApiId), item]));

  console.log("");
  console.log(`원본 ${items.length}건 · ${commit ? "COMMIT (실제로 씁니다)" : "DRY RUN (쓰지 않습니다)"}`);
  console.log("");

  const client = new pg.Client({ connectionString: readDatabaseUrl() });
  await client.connect();

  // 이 스크립트는 관광공사 원문을 담는 컬럼에 쓴다. 없는 DB에 붙으면 SQL 오류가 나므로
  // **쓰기 전에** 확인하고 사람이 읽을 수 있는 말로 멈춘다.
  const REQUIRED_COLUMNS = ["descriptionKr", "descriptionEn", "parking", "usageGuideKr"];
  const { rows: columnRows } = await client.query(
    `SELECT column_name FROM information_schema.columns
      WHERE table_schema = current_schema() AND table_name = 'Place'
        AND column_name = ANY($1::text[])`,
    [REQUIRED_COLUMNS],
  );
  const missingColumns = REQUIRED_COLUMNS.filter(
    (name) => !columnRows.some((row) => row.column_name === name),
  );
  if (missingColumns.length > 0) {
    await client.end();
    console.error("");
    console.error(`이 DB에 아직 없는 컬럼이 있습니다: ${missingColumns.join(", ")}`);
    console.error("마이그레이션 20260920000000_place_description_parking 을 먼저 적용하세요.");
    console.error("  npx prisma migrate deploy");
    process.exitCode = 1;
    return;
  }

  // 같은 `tourApiId`는 아래 INSERT가 건너뛴다. 여기서 보는 것은 **tourApiId가 없는
  // 수동 등록 장소와 겹치는지**다. 이름이 같거나 100m 안에 있으면 알리기만 한다 —
  // 자동으로 합치거나 지우지 않는다. 판단은 사람이 한다.
  const duplicates = [];
  for (const item of items) {
    if (validate(item, 0)) continue;
    const { rows } = await client.query(
      `SELECT id, "nameKr", address, "tourApiId", visibility,
              ROUND(ST_Distance(location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography)::numeric) AS distance
         FROM "Place"
        WHERE ("tourApiId" IS NULL OR "tourApiId" <> $3)
          AND (replace(lower("nameKr"), ' ', '') = replace(lower($4), ' ', '')
               OR ST_DWithin(location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, 100))
        LIMIT 5`,
      [Number(item.lng), Number(item.lat), item.tourApiId, item.nameKr],
    );
    for (const row of rows) {
      duplicates.push(
        `${item.nameKr} (${item.tourApiId}) ↔ 기존 ${row.nameKr} [${row.id}] · ${row.visibility}` +
          ` · tourApiId=${row.tourApiId ?? '없음'} · ${row.distance}m · ${row.address}`,
      );
    }
  }
  if (duplicates.length > 0) {
    console.log(`잠재 중복 ${duplicates.length}건 — 이름이 같거나 100m 안에 기존 장소가 있습니다.`);
    for (const line of duplicates) console.log(`  - ${line}`);
    console.log('  자동으로 합치거나 지우지 않았습니다. 사람이 확인해 주세요.');
    console.log('');
  }

  let created = 0, existing = 0, attributions = 0;
  const failures = [...itemFailures];

  // 전체를 한 트랜잭션에서 돌리고, `--commit`이 없으면 끝에서 되돌린다.
  // dry-run도 실제 SQL을 그대로 실행하므로 제약 위반을 미리 잡는다.
  await client.query("BEGIN");

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    if (validate(item, i)) continue;

    // 한 건이 실패하면 트랜잭션 전체가 abort되므로 항목마다 savepoint를 둔다.
    await client.query("SAVEPOINT item");
    try {
      // 이미 있는 원본은 건너뛴다. 관리자가 조건을 채우고 공개로 바꿔 둔 장소를
      // 재실행이 되돌리면 안 되므로 UPDATE 하지 않는다(명세서 §12-2 — `이미 있는 건 건너뜀`).
      const placeId = crypto.randomUUID();
      const { rowCount } = await client.query(
        `INSERT INTO "Place"
           (id, "tourApiId", "nameKr", "nameEn", category, address, location,
            phone, website, "thumbnailUrl",
            "descriptionKr", "descriptionEn", parking, "usageGuideKr", hours,
            visibility, "updatedAt")
         VALUES
           ($1, $2, $3, $4, $5::"Category", $6,
            ST_SetSRID(ST_MakePoint($7, $8), 4326)::geography,
            $9, $10, $11,
            $12, NULL, $13::"ParkingAvailability", $14, $15::jsonb,
            'DRAFT'::"PlaceVisibility", NOW())
         ON CONFLICT ("tourApiId") DO NOTHING`,
        [
          placeId,
          item.tourApiId,
          item.nameKr,
          item.nameEn ?? null,
          item.category,
          item.address,
          Number(item.lng),
          Number(item.lat),
          item.phone ?? null,
          item.website ?? null,
          item.thumbnailUrl ?? null,
          // 한국어 원문. `descriptionEn`은 **비운다** — 없는 영문을 만들어 내지 않는다.
          item.descriptionKr ?? null,
          item.parking ?? "UNKNOWN",
          item.usageGuideKr ?? null,
          item.hours ? JSON.stringify(item.hours) : null,
        ],
      );
      if (rowCount === 1) {
        created += 1;
        // 새로 만든 장소에만 출처를 붙인다. 이미 있던 장소의 출처 기록을 건드리면
        // 관리자가 확인해 둔 검토 상태를 재실행이 지워 버린다.
        const row = attributionRowFor(item, metaById.get(String(item.tourApiId)));
        if (row) {
          await client.query(
            `INSERT INTO "PlaceImageAttribution"
               (id, "placeId", "imageUrl", provider, "copyrightHolder", "workTitle",
                "createdYear", "sourceUrl", "licenseType", "licenseUrl",
                "reviewedBy", "reviewedAt",
                "preparationId", "sourceSnapshotSha256", "sourceFetchedAt", "updatedAt")
             VALUES
               ($1, $2, $3, $4, $5, $6, $7, $8, $9::"ImageLicenseType", $10,
                NULL, NULL, $11, $12, $13, NOW())
             ON CONFLICT ("placeId") DO NOTHING`,
            [
              crypto.randomUUID(),
              placeId,
              row.imageUrl,
              row.provider,
              row.copyrightHolder,
              row.workTitle,
              row.createdYear,
              row.sourceUrl,
              row.licenseType,
              row.licenseUrl,
              loaded.meta.preparationId,
              row.sourceSnapshotSha256,
              row.sourceFetchedAt,
            ],
          );
          attributions += 1;
        }
      } else {
        existing += 1;
      }
      await client.query("RELEASE SAVEPOINT item");
    } catch (error) {
      // 한 건이 실패해도 전체를 멈추지 않는다(명세서 §12-2 — 부분 실패 허용).
      await client.query("ROLLBACK TO SAVEPOINT item");
      await client.query("RELEASE SAVEPOINT item");
      failures.push(`#${i} (${item.nameKr}): ${error.message}`);
    }
  }

  await client.query(commit ? "COMMIT" : "ROLLBACK");
  await client.end();

  console.log(`처리   ${items.length}건`);
  console.log(`신규   ${created}건`);
  console.log(`건너뜀 ${existing}건 (이미 있는 tourApiId)`);
  console.log(`출처   ${attributions}건 (검토 전 상태로 저장 — 공개 화면에는 아직 나오지 않는다)`);
  console.log("원본 정보(소개·운영 안내·주차·운영시간)를 함께 넣었습니다. 조건과 확인 기록은 만들지 않았습니다.");
  console.log(`실패   ${failures.length}건`);
  if (!commit) {
    console.log("");
    console.log("DRY RUN이라 되돌렸습니다. 실제로 넣으려면 --commit 을 붙이세요.");
  }
  if (failures.length > 0) {
    console.log("");
    for (const f of failures) console.log(`  - ${f}`);
    process.exitCode = 1;
  }
}

// 테스트가 `validate`만 import할 수 있도록, 직접 실행했을 때만 돈다.
const invokedDirectly =
  process.argv[1] != null &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
