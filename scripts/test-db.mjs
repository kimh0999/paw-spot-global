#!/usr/bin/env node
/**
 * 통합 테스트용 **격리 PostgreSQL**을 띄우고 마이그레이션을 적용한다.
 *
 * 운영 Supabase DB는 건드리지 않는다. 이 스크립트가 만드는 것은 로컬 컨테이너뿐이고,
 * 테스트에는 `TEST_DATABASE_URL`을 명시적으로 넘긴다 — 값이 없으면 통합 테스트는
 * 운영 연결로 넘어가지 않고 **건너뛴다**(`*.db.test.ts` 참조).
 *
 *   node scripts/test-db.mjs up      컨테이너 기동 + 마이그레이션 적용
 *   node scripts/test-db.mjs test    up 후 통합 테스트 실행
 *   node scripts/test-db.mjs seed    화면 확인용 데이터 넣기 (기존 병원 데이터는 비운다)
 *   node scripts/test-db.mjs psql    격리 DB에 psql 접속
 *   node scripts/test-db.mjs down    컨테이너 제거 (데이터도 사라진다)
 *
 * 전제: Docker가 떠 있어야 한다. 이미지는 PostGIS 포함본을 쓴다 —
 * 이 저장소의 마이그레이션에는 `CREATE EXTENSION postgis`가 없고
 * (운영은 Supabase가 확장을 제공한다) `geography` 컬럼이 확장을 요구하기 때문이다.
 */
import { execFileSync, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const CONTAINER = "pawspot-test-db";
const IMAGE = "postgis/postgis:17-3.5";
const PORT = 55432;
const DB = "pawspot_test";

/**
 * 자격증명이 없는 로컬 전용 접속 정보.
 * 컨테이너는 `trust` 인증에 127.0.0.1로만 바인딩하므로 비밀번호 자체가 없다 —
 * 로그·문서에 남길 비밀이 생기지 않는다.
 */
const URL = `postgresql://postgres@127.0.0.1:${PORT}/${DB}`;

function docker(args, opts = {}) {
  return execFileSync("docker", args, { encoding: "utf8", ...opts });
}

function isRunning() {
  try {
    return docker(["inspect", "-f", "{{.State.Running}}", CONTAINER]).trim() === "true";
  } catch {
    return false;
  }
}

function up() {
  try {
    docker(["info", "--format", "{{.ServerVersion}}"], { stdio: "pipe" });
  } catch {
    console.error("Docker 데몬이 꺼져 있다. Docker Desktop을 먼저 실행한다.");
    process.exit(1);
  }

  if (!isRunning()) {
    try {
      docker(["rm", "-f", CONTAINER], { stdio: "ignore" });
    } catch {
      // 없으면 그만이다.
    }
    console.log(`컨테이너 기동 (${IMAGE})`);
    docker([
      "run",
      "-d",
      "--name",
      CONTAINER,
      "-e",
      "POSTGRES_HOST_AUTH_METHOD=trust",
      "-e",
      `POSTGRES_DB=${DB}`,
      "-p",
      `127.0.0.1:${PORT}:5432`,
      IMAGE,
    ]);
  }

  for (let i = 0; i < 60; i++) {
    try {
      docker(["exec", CONTAINER, "pg_isready", "-U", "postgres", "-d", DB], { stdio: "ignore" });
      break;
    } catch {
      spawnSync(process.execPath, ["-e", "setTimeout(()=>{},1000)"], { timeout: 1200 });
    }
  }

  const info = docker([
    "exec",
    CONTAINER,
    "psql",
    "-U",
    "postgres",
    "-d",
    DB,
    "-tAc",
    "SELECT 'PG '||current_setting('server_version')||' / PostGIS '||coalesce((SELECT extversion FROM pg_extension WHERE extname='postgis'),'없음')",
  ]).trim();
  console.log(`격리 DB 준비: ${info}`);

  console.log("마이그레이션 적용 (prisma migrate deploy)");
  const migrate = spawnSync("npx", ["prisma", "migrate", "deploy"], {
    stdio: "inherit",
    shell: process.platform === "win32",
    // prisma.config.ts가 MIGRATE_DATABASE_URL을 먼저 본다. dotenv는 이미 설정된 값을
    // 덮어쓰지 않으므로 여기서 넘긴 값이 이긴다.
    env: { ...process.env, MIGRATE_DATABASE_URL: URL },
  });
  if (migrate.status !== 0) process.exit(migrate.status ?? 1);
}

function runTests() {
  up();
  const args = process.argv.slice(3);
  // vitest의 위치 인자는 glob이 아니라 경로 부분 문자열 필터다. `**`를 쓰면 0개가 잡힌다.
  //
  // `--no-file-parallelism`은 없으면 안 된다. 통합 테스트 파일들은 **같은 DB 한 벌**을
  // 공유하고 각자 TRUNCATE로 상태를 비운다. 병렬로 돌면 한 파일이 만든 행을 다른 파일이
  // 지워 버려 제품 코드와 무관한 실패가 난다.
  const result = spawnSync(
    "npx",
    ["vitest", "run", "--no-file-parallelism", ...(args.length ? args : [".db.test.ts"])],
    {
      stdio: "inherit",
      shell: process.platform === "win32",
      // 애플리케이션 코드는 DATABASE_URL을 읽는다. 테스트 파일이 TEST_DATABASE_URL을 보고
      // 스스로 덮어쓰므로, 여기서는 격리 URL만 명시적으로 넘긴다.
      env: { ...process.env, TEST_DATABASE_URL: URL },
    },
  );
  process.exit(result.status ?? 1);
}


/**
 * 화면 확인용 데이터.
 *
 * 실제 표본 5곳은 `scripts/vet-samples.daejeon.json`에서 그대로 읽어 **DRAFT로** 넣는다.
 * 검수를 거치지 않은 병원을 공개 목록에 올리지 않기 위해서다. 사용자 화면에 보여야 하는
 * 경우들(좌표 없음, 미확인, 재확인 기한 경과, 값 변경으로 근거 이탈, 숨김)은 이름에
 * `테스트`가 붙은 가상 병원으로 만든다. 실제 병원에 없는 사실을 붙이지 않기 위해서다.
 *
 * `verifiedValue`는 대부분 NULL로 둔다. `resolveVetItem`이 NULL을 "값에 묶이지 않은 옛
 * 기록"으로 보고 현재 값과 대조 없이 근거로 인정하므로, 스냅샷 인코딩을 이 스크립트에
 * 복제하지 않고도 확인/재확인 상태를 날짜만으로 만들 수 있다. 값 변경으로 근거가 떨어지는
 * 경우만 일부러 현재 값과 다른 문자열을 넣는다.
 */
const DAY = 24 * 60 * 60 * 1000;

function clinicRow(overrides) {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    nameEn: null,
    website: null,
    hours: null,
    hoursNote: null,
    lat: null,
    lng: null,
    englishSupport: "UNKNOWN",
    englishSupportCondition: null,
    afterHours: "UNKNOWN",
    afterHoursCondition: null,
    visibility: "DRAFT",
    adminNote: null,
    collectedAt: now,
    verifications: [],
    ...overrides,
  };
}

function fixtures(now) {
  const recent = new Date(now.getTime() - 3 * DAY);
  const old = new Date(now.getTime() - 45 * DAY);
  const basic = (verifiedAt, verifiedValue = null) => ({
    target: "BASIC",
    method: "WEBSITE",
    verifiedAt,
    sourceUrl: "https://example.test/fixture",
    note: null,
    verifiedValue,
  });

  return [
    clinicRow({
      nameKr: "테스트 둔산 동물병원",
      nameEn: "Test Dunsan Animal Hospital",
      district: "seo",
      address: "대전광역시 서구 둔산로 100",
      phone: "042-000-0001",
      lat: 36.3504,
      lng: 127.3845,
      website: "https://example.test/dunsan",
      hoursNote: "안내된 진료시간: 평일 09:00-19:00",
      englishSupport: "AVAILABLE",
      afterHours: "CONDITIONAL",
      afterHoursCondition: "22시까지만 접수",
      visibility: "VISIBLE",
      verifications: [
        basic(recent),
        { ...basic(recent), target: "ENGLISH_SUPPORT" },
        { ...basic(recent), target: "AFTER_HOURS" },
      ],
    }),
    clinicRow({
      nameKr: "테스트 좌표없는 동물병원",
      district: "yuseong",
      address: "대전광역시 유성구 대학로 200",
      phone: "042-000-0002",
      visibility: "VISIBLE",
      verifications: [basic(recent)],
    }),
    clinicRow({
      nameKr: "테스트 재확인필요 동물병원",
      district: "jung",
      address: "대전광역시 중구 중앙로 300",
      phone: "042-000-0003",
      lat: 36.3272,
      lng: 127.4232,
      englishSupport: "UNAVAILABLE",
      visibility: "VISIBLE",
      verifications: [basic(old), { ...basic(old), target: "ENGLISH_SUPPORT" }],
    }),
    clinicRow({
      nameKr: "테스트 값바뀐 동물병원",
      district: "dong",
      address: "대전광역시 동구 대전로 400",
      phone: "042-000-0004",
      lat: 36.3271,
      lng: 127.4541,
      visibility: "VISIBLE",
      // 현재 값과 다른 스냅샷 → 근거가 떨어져 나간 상태(staleByValueChange)로 읽혀야 한다.
      verifications: [basic(recent, "예전에 확인한 다른 값")],
    }),
    clinicRow({
      nameKr: "테스트 숨김 동물병원",
      district: "daedeok",
      address: "대전광역시 대덕구 계족로 500",
      phone: "042-000-0005",
      visibility: "HIDDEN",
      verifications: [basic(recent)],
    }),
  ];
}

function sampleRows() {
  const file = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "scripts", "vet-samples.daejeon.json"), "utf8"),
  );
  return file.samples.map(({ input }) =>
    clinicRow({
      nameKr: input.nameKr,
      nameEn: input.nameEn,
      district: input.district,
      address: input.address,
      phone: input.phone,
      website: input.website,
      englishSupport: input.englishSupport.status,
      afterHours: input.afterHours.status,
      adminNote: input.adminNote,
      collectedAt: new Date(input.collectedAt),
      visibility: "DRAFT",
      verifications: input.verifications.map((record) => ({
        target: record.target,
        method: record.method,
        verifiedAt: new Date(record.verifiedAt),
        sourceUrl: record.sourceUrl,
        note: record.note,
        verifiedValue: null,
      })),
    }),
  );
}

async function seed() {
  up();

  const client = new pg.Client({ connectionString: URL });
  await client.connect();
  try {
    // 이 명령은 격리 DB의 병원 데이터만 비운다. 운영 DB에는 닿지 않는다.
    await client.query('TRUNCATE TABLE "VetClinic" CASCADE');

    const now = new Date();
    const rows = [...fixtures(now), ...sampleRows()];

    for (const row of rows) {
      await client.query(
        `INSERT INTO "VetClinic" (
           "id","nameKr","nameEn","district","address","phone","location","website",
           "hours","hoursNote","englishSupport","englishSupportCondition",
           "afterHours","afterHoursCondition","visibility","adminNote","collectedAt","updatedAt"
         ) VALUES (
           $1,$2,$3,$4,$5,$6,
           CASE WHEN $7::float8 IS NULL THEN NULL
                ELSE ST_SetSRID(ST_MakePoint($8::float8, $7::float8), 4326)::geography END,
           $9,$10::jsonb,$11,$12,$13,$14,$15,$16,$17,$18,NOW()
         )`,
        [
          row.id, row.nameKr, row.nameEn, row.district, row.address, row.phone,
          row.lat, row.lng, row.website, row.hours, row.hoursNote,
          row.englishSupport, row.englishSupportCondition,
          row.afterHours, row.afterHoursCondition, row.visibility, row.adminNote,
          row.collectedAt,
        ],
      );

      for (const record of row.verifications) {
        await client.query(
          `INSERT INTO "VetVerification"
             ("id","clinicId","target","method","verifiedBy","verifiedAt","sourceUrl","note","verifiedValue")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [
            crypto.randomUUID(), row.id, record.target, record.method,
            "seed@example.test", record.verifiedAt, record.sourceUrl, record.note,
            record.verifiedValue,
          ],
        );
      }
    }

    const counts = await client.query(
      `SELECT "visibility", count(*)::int AS n FROM "VetClinic" GROUP BY "visibility" ORDER BY 1`,
    );
    console.log("넣은 병원:", counts.rows.map((r) => `${r.visibility} ${r.n}`).join(" / "));
    console.log(`격리 DB로 dev 서버 띄우기:
  DATABASE_URL="${URL}" npm run dev`);
  } finally {
    await client.end();
  }
}

const command = process.argv[2] ?? "up";
if (command === "up") up();
else if (command === "test") runTests();
else if (command === "seed") await seed();
else if (command === "down") {
  docker(["rm", "-f", CONTAINER], { stdio: "inherit" });
} else if (command === "psql") {
  spawnSync("docker", ["exec", "-it", CONTAINER, "psql", "-U", "postgres", "-d", DB], {
    stdio: "inherit",
  });
} else {
  console.error(`알 수 없는 명령: ${command}. up | test | down | psql`);
  process.exit(1);
}
