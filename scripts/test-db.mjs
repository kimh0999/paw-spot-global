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
 *   node scripts/test-db.mjs psql    격리 DB에 psql 접속
 *   node scripts/test-db.mjs down    컨테이너 제거 (데이터도 사라진다)
 *
 * 전제: Docker가 떠 있어야 한다. 이미지는 PostGIS 포함본을 쓴다 —
 * 이 저장소의 마이그레이션에는 `CREATE EXTENSION postgis`가 없고
 * (운영은 Supabase가 확장을 제공한다) `geography` 컬럼이 확장을 요구하기 때문이다.
 */
import { execFileSync, spawnSync } from "node:child_process";

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

const command = process.argv[2] ?? "up";
if (command === "up") up();
else if (command === "test") runTests();
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
