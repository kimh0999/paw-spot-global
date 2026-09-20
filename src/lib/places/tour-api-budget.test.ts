import { execFile } from "node:child_process";
import { createServer, type Server } from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

// 스크립트에서 직접 가져온다. 규칙을 두 곳에 적어 두면 갈라진다.
import {
  BudgetError,
  DEFAULT_CALL_BUDGET,
  budgetPathFor,
  createBudgetGate,
  reserve,
  reset,
  resolveLimit,
  summary,
} from "../../../scripts/tour-api-budget.mjs";

/**
 * 실제 호출 예산 (2026-09-20 초과 사고 이후).
 *
 * **이 파일은 공공 API를 부르지 않는다.** 예산 로직은 파일만 만지고,
 * 수집 스크립트 검증은 로컬 가짜 서버(`TOUR_API_BASE_URL`)로 한다.
 */

let workDir: string;
let budgetFile: string;

beforeEach(() => {
  workDir = fs.mkdtempSync(path.join(os.tmpdir(), "pawspot-budget-"));
  fs.mkdirSync(path.join(workDir, "data", "tour-api"), { recursive: true });
  budgetFile = budgetPathFor(workDir);
});

afterEach(() => {
  fs.rmSync(workDir, { recursive: true, force: true });
});

describe("호출 예산 차감", () => {
  it("상한까지 쓰고 그 다음 요청은 거부한다", () => {
    for (let i = 1; i <= 3; i += 1) {
      expect(reserve(budgetFile, { endpoint: "areaBasedList2", limit: 3 }).used).toBe(i);
    }
    expect(() => reserve(budgetFile, { endpoint: "detailCommon2", limit: 3 })).toThrow(BudgetError);
  });

  it("거부된 요청도 기록에 남는다 — 몇 번 막혔는지 보고할 수 있어야 한다", () => {
    reserve(budgetFile, { endpoint: "a", limit: 1 });
    expect(() => reserve(budgetFile, { endpoint: "b", limit: 1 })).toThrow();
    const state = summary(budgetFile, 1);
    expect(state.total).toBe(1);
    expect(state.denied).toBe(1);
  });

  it("엔드포인트별로 센다", () => {
    reserve(budgetFile, { endpoint: "areaBasedList2", limit: 10 });
    reserve(budgetFile, { endpoint: "detailCommon2", limit: 10 });
    reserve(budgetFile, { endpoint: "detailCommon2", limit: 10 });
    expect(summary(budgetFile, 10).byEndpoint).toEqual({
      areaBasedList2: 1,
      detailCommon2: 2,
    });
  });

  it("**다시 실행해도 0부터 시작하지 않는다** — 명령을 나눠 상한을 우회할 수 없다", () => {
    const first = createBudgetGate(workDir, { limit: 2 });
    first.reserve("areaBasedList2");
    // 다른 명령이 새로 만든 게이트라도 같은 파일을 본다.
    const second = createBudgetGate(workDir, { limit: 2 });
    second.reserve("detailCommon2");
    expect(() => second.reserve("detailIntro2")).toThrow(BudgetError);
    expect(summary(budgetFile, 2).total).toBe(2);
  });

  it("상한을 더 크게 줘도 이미 쓴 횟수는 살아 있다", () => {
    const gate = createBudgetGate(workDir, { limit: 2 });
    gate.reserve("a");
    gate.reserve("b");
    // 상한을 늘려 잡아도 사용량은 그대로다. 늘리는 것이 곧 초기화가 아니다.
    expect(summary(budgetFile, 99).total).toBe(2);
  });

  it("사람이 명시해야만 새 예산이 생긴다", () => {
    const gate = createBudgetGate(workDir, { limit: 1 });
    gate.reserve("a");
    expect(() => gate.reserve("b")).toThrow();
    reset(budgetFile, 1);
    expect(gate.reserve("b").used).toBe(1);
  });

  it("예산 파일이 깨졌으면 0부터 시작하지 않고 멈춘다", () => {
    fs.writeFileSync(budgetFile, "{ not json", "utf8");
    // 읽기 실패는 빈 상태로 떨어지지만, 형식이 다른 JSON은 사람을 부른다.
    fs.writeFileSync(budgetFile, JSON.stringify({ formatVersion: 99 }), "utf8");
    expect(() => reserve(budgetFile, { endpoint: "a", limit: 5 })).toThrow(BudgetError);
  });

  it("상한 값은 정수만 받는다", () => {
    expect(resolveLimit(undefined)).toBe(DEFAULT_CALL_BUDGET);
    expect(resolveLimit("7")).toBe(7);
    expect(() => resolveLimit("무제한")).toThrow(BudgetError);
    expect(() => resolveLimit("-1")).toThrow(BudgetError);
  });

  it("동시에 예약해도 상한을 넘지 않는다", () => {
    const limit = 5;
    let granted = 0;
    // 같은 프로세스의 병렬 레인이 겹쳐 읽는 상황을 흉내 낸다.
    for (let i = 0; i < 20; i += 1) {
      try {
        reserve(budgetFile, { endpoint: "areaBasedList2", limit });
        granted += 1;
      } catch {
        /* 상한 도달 */
      }
    }
    expect(granted).toBe(limit);
  });
});

/**
 * 수집 스크립트가 **실제로** 예산을 거치는지, 그리고 `--refresh-codes`가 상세 수집으로
 * 이어지지 않는지. 가짜 HTTP 서버로 확인한다 — 공공 API를 부르지 않는다.
 */
describe("수집 스크립트 (가짜 응답)", () => {
  const projectRoot = path.resolve(__dirname, "..", "..", "..");
  let server: Server;
  let baseUrl: string;
  let requested: string[];
  let sandbox: string;

  const okBody = (items: unknown[]) => ({
    response: {
      header: { resultCode: "0000", resultMsg: "OK" },
      body: { items: items.length === 0 ? "" : { item: items }, totalCount: items.length },
    },
  });

  beforeEach(async () => {
    requested = [];
    // 스크립트는 프로젝트 루트의 data/tour-api에 쓴다. 실제 스냅샷을 건드리지 않도록
    // 복사본 폴더에서 돌린다.
    sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "pawspot-collect-"));
    fs.mkdirSync(path.join(sandbox, "scripts"), { recursive: true });
    fs.mkdirSync(path.join(sandbox, "data", "tour-api"), { recursive: true });
    for (const file of [
      "collect-tour-area.cjs",
      "tour-api-budget.mjs",
      "tour-classification.mjs",
      "tour-pet-policy.mjs",
    ]) {
      fs.copyFileSync(path.join(projectRoot, "scripts", file), path.join(sandbox, "scripts", file));
    }
    // loadKey가 next/@next/env를 찾으므로 실제 프로젝트의 package.json/node_modules를 빌려준다.
    fs.writeFileSync(
      path.join(sandbox, "package.json"),
      fs.readFileSync(path.join(projectRoot, "package.json")),
    );
    fs.symlinkSync(
      path.join(projectRoot, "node_modules"),
      path.join(sandbox, "node_modules"),
      "junction",
    );

    server = createServer((req, res) => {
      const url = new URL(req.url ?? "/", "http://127.0.0.1");
      const endpoint = url.pathname.split("/").filter(Boolean).pop() ?? "";
      requested.push(endpoint);
      const body =
        endpoint === "lclsSystmCode2"
          ? okBody(url.searchParams.get("lclsSystm1") ? [] : [{ code: "FD", name: "음식" }])
          : endpoint === "ldongCode2"
            ? okBody([{ code: "110", name: "동구" }])
            : endpoint === "areaBasedList2"
              ? okBody([
                  {
                    contentid: "1",
                    contenttypeid: "12",
                    title: "가짜 장소",
                    lclsSystm1: "NA",
                    lclsSystm2: "NA04",
                    lclsSystm3: "NA040600",
                  },
                ])
              : okBody([{ contentid: "1", contenttypeid: "12", title: "가짜 장소" }]);
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify(body));
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (address == null || typeof address === "string") throw new Error("서버 주소를 얻지 못했다");
    baseUrl = `http://127.0.0.1:${address.port}/`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    fs.rmSync(sandbox, { recursive: true, force: true });
  });

  /**
   * **비동기로 돌린다.** 가짜 서버가 이 프로세스에 떠 있어서, 동기 실행으로 자식을 기다리면
   * 부모의 이벤트 루프가 막혀 서버가 연결을 받지 못한다(교착).
   */
  function runCollect(
    args: string[],
    env: Record<string, string> = {},
  ): Promise<{ stdout: string; failed: boolean }> {
    return new Promise((resolve) => {
      execFile(
        process.execPath,
        [path.join(sandbox, "scripts", "collect-tour-area.cjs"), ...args],
        {
          encoding: "utf8",
          cwd: sandbox,
          env: {
            ...process.env,
            TOUR_API_BASE_URL: baseUrl,
            // 실제 키를 가짜 서버에 보내지 않는다. @next/env는 이미 있는 값을 덮지 않는다.
            TOUR_API_SERVICE_KEY: "TEST-KEY-NOT-REAL",
            ...env,
          },
        },
        (error, stdout) => resolve({ stdout: String(stdout), failed: error != null }),
      );
    });
  }

  it("--refresh-codes는 코드표만 받고 상세 수집으로 이어지지 않는다", async () => {
    const { stdout: output } = await runCollect(["--refresh-codes", "--region", "30"], {
      TOUR_API_CALL_BUDGET: "30",
    });

    expect(requested).toContain("lclsSystmCode2");
    expect(requested).toContain("ldongCode2");
    // 이것이 588회 사고의 원인이었다.
    expect(requested).not.toContain("areaBasedList2");
    expect(requested).not.toContain("detailCommon2");
    expect(requested).not.toContain("detailIntro2");
    expect(requested).not.toContain("detailPetTour2");
    expect(output).toContain("수집은 하지 않았습니다");
  });

  it("상한에 닿으면 그 다음 요청을 보내지 않는다", async () => {
    await runCollect(["--region", "30"], { TOUR_API_CALL_BUDGET: "2" });
    // 목록 1회 + 상세 1회까지만 나가고 멈춘다. 상한 다음 요청은 보내지 않는다.
    expect(requested.length).toBe(2);

    const state = JSON.parse(fs.readFileSync(budgetPathFor(sandbox), "utf8"));
    expect(state.total).toBe(2);
    expect(state.denied).toBeGreaterThan(0);
  });

  it("상한이 0이면 한 번도 보내지 않는다", async () => {
    await runCollect(["--region", "30"], { TOUR_API_CALL_BUDGET: "0" });
    expect(requested).toHaveLength(0);
  });
});
