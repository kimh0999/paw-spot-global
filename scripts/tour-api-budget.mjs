/**
 * TourAPI **실제 호출 예산**. 작업 단위로 공유되고 보존된다.
 *
 * 왜 있나 — 2026-09-20 작업에서 50회 예산이 588회까지 넘어갔다. 원인은 수집 명령 하나가
 * 목록 181건 × 상세 3회를 부른 것이었고, **아무도 세고 있지 않았다.** 스크립트마다 따로
 * 세면 다음 명령에서 다시 0부터 시작하므로, 횟수는 **파일에 남는다.**
 *
 * 규칙
 *   - **HTTP 요청을 보내기 전에** `reserve()`로 먼저 차감한다. 성공·실패·재시도를 모두 센다.
 *     응답을 받은 뒤에 세면 실패한 요청이 공짜가 되고, 재시도가 예산을 우회한다.
 *   - 상한에 닿으면 그 다음 요청은 **보내지 않는다.** 던지고 멈춘다.
 *   - 파일은 프로세스·명령·재실행을 가로질러 공유된다. 새 예산은 사람이 `reset()`
 *     (`--reset-budget`)으로 명시할 때만 생긴다.
 *   - 같은 파일을 여러 프로세스가 동시에 고칠 수 있으므로 잠금 파일로 읽기-수정-쓰기를 감싼다.
 *
 * 이 모듈은 네트워크를 모른다. 그래서 테스트가 실제 API 없이 돌 수 있다.
 */
import fs from "node:fs";
import path from "node:path";

/** 기본 상한. `TOUR_API_CALL_BUDGET`으로 덮을 수 있다. */
export const DEFAULT_CALL_BUDGET = 30;
export const BUDGET_FORMAT_VERSION = 1;

const LOCK_RETRY_LIMIT = 200;
const LOCK_STALE_MS = 10_000;

export class BudgetError extends Error {}

export function budgetPathFor(projectRoot) {
  return path.join(projectRoot, "data", "tour-api", "call-budget.json");
}

/** 환경변수로 준 상한. 숫자가 아니면 기본값을 쓴다 — 오타로 예산이 무한이 되지 않게 한다. */
export function resolveLimit(rawValue) {
  if (rawValue == null || String(rawValue).trim() === "") return DEFAULT_CALL_BUDGET;
  const parsed = Number(String(rawValue).trim());
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new BudgetError("TOUR_API_CALL_BUDGET은 0 이상의 정수여야 합니다.");
  }
  return parsed;
}

function emptyState(limit) {
  return {
    formatVersion: BUDGET_FORMAT_VERSION,
    limit,
    startedAt: new Date().toISOString(),
    total: 0,
    denied: 0,
    byEndpoint: {},
    lastCallAt: null,
  };
}

function readState(file, limit) {
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return emptyState(limit);
  }
  if (parsed?.formatVersion !== BUDGET_FORMAT_VERSION || !Number.isInteger(parsed.total)) {
    // 형식을 못 읽으면 **0부터 시작하지 않는다.** 이미 쓴 횟수를 잃으면 예산이 새로 생긴다.
    throw new BudgetError(
      `호출 예산 파일을 읽지 못했습니다: ${file}. 사람이 확인한 뒤 --reset-budget으로 새로 시작하세요.`,
    );
  }
  return parsed;
}

/**
 * 잠금 파일로 감싼 읽기-수정-쓰기. 같은 파일을 동시에 고치는 프로세스가 있어도
 * 차감이 겹쳐 사라지지 않는다. 오래된 잠금은 버린다 — 죽은 프로세스가 예산을 영원히 막지 않게.
 */
function withLock(file, mutate) {
  const lockFile = `${file}.lock`;
  fs.mkdirSync(path.dirname(file), { recursive: true });

  let handle = null;
  for (let attempt = 0; attempt < LOCK_RETRY_LIMIT; attempt += 1) {
    try {
      handle = fs.openSync(lockFile, "wx");
      break;
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
      let age = 0;
      try {
        age = Date.now() - fs.statSync(lockFile).mtimeMs;
      } catch {
        continue;
      }
      if (age > LOCK_STALE_MS) {
        try {
          fs.unlinkSync(lockFile);
        } catch {
          /* 다른 프로세스가 먼저 지웠다 */
        }
        continue;
      }
      // 짧은 동기 대기. 이 구간은 파일 한 줄 고치는 시간이라 길지 않다.
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5);
    }
  }
  if (handle == null) throw new BudgetError("호출 예산 파일 잠금을 얻지 못했습니다.");

  try {
    const result = mutate();
    return result;
  } finally {
    fs.closeSync(handle);
    try {
      fs.unlinkSync(lockFile);
    } catch {
      /* 이미 지워졌다 */
    }
  }
}

/**
 * 요청 한 번을 예약한다. **`fetch` 직전에 부른다.**
 * 남은 예산이 없으면 던진다 — 호출자는 요청을 보내지 않고 멈춰야 한다.
 */
export function reserve(file, { endpoint, limit }) {
  return withLock(file, () => {
    const state = readState(file, limit);
    // 상한은 환경변수가 바뀌어도 **이번 작업의 값**을 따른다. 낮추는 것만 즉시 반영한다.
    state.limit = Math.min(state.limit, limit);

    if (state.total >= state.limit) {
      state.denied += 1;
      fs.writeFileSync(file, JSON.stringify(state, null, 2) + "\n", "utf8");
      throw new BudgetError(
        `실제 API 호출 상한 ${state.limit}회를 모두 썼습니다 (요청하려던 엔드포인트: ${endpoint}). ` +
          "요청을 보내지 않고 멈춥니다. 남은 작업은 저장된 스냅샷으로 진행하세요.",
      );
    }

    state.total += 1;
    state.byEndpoint[endpoint] = (state.byEndpoint[endpoint] ?? 0) + 1;
    state.lastCallAt = new Date().toISOString();
    fs.writeFileSync(file, JSON.stringify(state, null, 2) + "\n", "utf8");
    return { used: state.total, limit: state.limit, remaining: state.limit - state.total };
  });
}

export function summary(file, limit) {
  return withLock(file, () => {
    const state = readState(file, limit);
    return {
      limit: state.limit,
      total: state.total,
      denied: state.denied,
      byEndpoint: { ...state.byEndpoint },
      startedAt: state.startedAt,
    };
  });
}

/** 새 예산을 시작한다. **사람이 명시할 때만** 부른다. */
export function reset(file, limit) {
  return withLock(file, () => {
    const state = emptyState(limit);
    fs.writeFileSync(file, JSON.stringify(state, null, 2) + "\n", "utf8");
    return state;
  });
}

/**
 * 스크립트가 쓰는 조립본. 예산 파일 경로와 상한을 한 번 정해 두고
 * `gate.reserve(endpoint)`만 부르게 한다.
 */
export function createBudgetGate(projectRoot, { limit = resolveLimit(process.env.TOUR_API_CALL_BUDGET) } = {}) {
  const file = budgetPathFor(projectRoot);
  return {
    file,
    limit,
    reserve: (endpoint) => reserve(file, { endpoint, limit }),
    summary: () => summary(file, limit),
    reset: () => reset(file, limit),
  };
}
