#!/usr/bin/env node
/**
 * 후보 장소 Import (P0 #14 · T-13 · 결정 D-05·D-06)
 *
 * 원본 파일의 장소를 `Place` 테이블에 **후보**(`visibility = DRAFT`)로 넣는다.
 * 별도 후보 모델을 만들지 않는다(D-05). 조건(`PlaceCondition`)과 검증(`Verification`)은
 * 만들지 않는다 — Import는 조건을 **추측하지 않는다**.
 *
 * 사용자 조회는 `visibility = VISIBLE` **그리고** 검증 이력 존재를 모두 요구하므로
 * (`lib/places/queries.ts`의 `PUBLIC_PLACE_WHERE`), 후보는 두 조건 모두에서 걸러진다.
 *
 * 실행
 *   npm run import:places -- --file ./scripts/import-places.example.json
 *   npm run import:places -- --file ./data.json --commit
 *
 * **기본은 dry-run이다.** `--commit`을 붙여야 실제로 쓴다. 이 저장소는 운영 Supabase가
 * 하나뿐이라 실수로 쓰면 되돌릴 곳이 없다.
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
import pg from "pg";

export const CATEGORIES = new Set(["RESTAURANT", "CAFE", "TRAVEL", "ETC"]);
// 관리자 폼(`lib/validation/place.ts`)과 같은 한국 범위. 여기서 넓히지 않는다.
const LAT_MIN = 33, LAT_MAX = 43;
const LNG_MIN = 124, LNG_MAX = 132;

function parseArgs(argv) {
  const args = { file: null, commit: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--file") args.file = argv[i + 1];
    else if (argv[i] === "--commit") args.commit = true;
  }
  return args;
}

function readDatabaseUrl() {
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
  return null;
}

async function main() {
  const { file, commit } = parseArgs(process.argv.slice(2));

  if (!file) {
    console.error("사용법: npm run import:places -- --file <경로> [--commit]");
    process.exitCode = 1;
    return;
  }
  if (!fs.existsSync(file)) {
    console.error(`파일을 찾을 수 없습니다: ${file}`);
    process.exitCode = 1;
    return;
  }

  let items;
  try {
    items = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    console.error(`JSON을 읽지 못했습니다: ${error.message}`);
    process.exitCode = 1;
    return;
  }
  if (!Array.isArray(items)) {
    console.error("최상위가 배열이어야 합니다.");
    process.exitCode = 1;
    return;
  }

  console.log(`원본 ${items.length}건 · ${commit ? "COMMIT (실제로 씁니다)" : "DRY RUN (쓰지 않습니다)"}`);
  console.log("");

  const client = new pg.Client({ connectionString: readDatabaseUrl() });
  await client.connect();

  let created = 0, existing = 0;
  const failures = [];

  // 전체를 한 트랜잭션에서 돌리고, `--commit`이 없으면 끝에서 되돌린다.
  // dry-run도 실제 SQL을 그대로 실행하므로 제약 위반을 미리 잡는다.
  await client.query("BEGIN");

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    const reason = validate(item, i);
    if (reason) {
      failures.push(reason);
      continue;
    }

    // 한 건이 실패하면 트랜잭션 전체가 abort되므로 항목마다 savepoint를 둔다.
    await client.query("SAVEPOINT item");
    try {
      // 이미 있는 원본은 건너뛴다. 관리자가 조건을 채우고 공개로 바꿔 둔 장소를
      // 재실행이 되돌리면 안 되므로 UPDATE 하지 않는다(명세서 §12-2 — `이미 있는 건 건너뜀`).
      const { rowCount } = await client.query(
        `INSERT INTO "Place"
           (id, "tourApiId", "nameKr", "nameEn", category, address, location,
            phone, website, "thumbnailUrl", visibility, "updatedAt")
         VALUES
           ($1, $2, $3, $4, $5::"Category", $6,
            ST_SetSRID(ST_MakePoint($7, $8), 4326)::geography,
            $9, $10, $11, 'DRAFT'::"PlaceVisibility", NOW())
         ON CONFLICT ("tourApiId") DO NOTHING`,
        [
          crypto.randomUUID(),
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
        ],
      );
      if (rowCount === 1) created += 1;
      else existing += 1;
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
  console.log(`실패   ${failures.length}건`);
  if (!commit) {
    console.log("");
    console.log("DRY RUN이라 되돌렸습니다. 실제로 넣으려면 --commit 을 붙이세요.");
  }
  if (failures.length > 0) {
    console.log("");
    for (const f of failures) console.log(`  - ${f}`);
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
