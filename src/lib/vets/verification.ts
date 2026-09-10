import {
  VET_RECHECK_AFTER_DAYS,
  type VetServiceStatus,
  type VetVerificationTarget,
} from "./constants";

/**
 * 항목별 확인 근거를 읽는 단 하나의 자리 (결정 D-17).
 *
 * **확인 근거는 항목에 붙고, 그 항목의 값에 묶인다.**
 * - 주소를 고쳐도 영어 응대 확인일은 갱신되지 않는다. 항목(`target`)이 다르기 때문이다.
 * - 값이 바뀌면 그 항목의 이전 기록은 **더 이상 유효하지 않다.** 기록이 확인한 값의
 *   스냅샷(`verifiedValue`)이 현재 값과 다르면 미확인으로 읽는다. 이것이 없으면
 *   "영어 응대 불가 → 가능"으로 고쳤을 때 불가를 확인한 기록이 가능을 검증한 것처럼 남는다.
 *
 * 화면·필터·공개 판정이 모두 이 함수를 통해 상태를 읽는다. 복제하지 않는다.
 */

export interface VetVerificationRecord {
  target: VetVerificationTarget;
  method: string;
  verifiedAt: Date;
  sourceUrl: string | null;
  note: string | null;
  /** 이 기록이 확인한 값의 스냅샷. null이면 값에 묶이지 않은 옛 기록으로 본다. */
  verifiedValue: string | null;
}

/** 항목이 지금 어떻게 읽히는지. `value`와 근거를 함께 돌려준다. */
export interface VetItemState {
  /** 확인 근거가 현재 값을 뒷받침하고 기한도 지나지 않았는가. */
  confirmed: boolean;
  /** 근거는 현재 값을 뒷받침하지만 기한이 지났는가. */
  needsRecheck: boolean;
  /** 현재 값을 뒷받침하는 가장 최근 기록. 없으면 null. */
  evidence: VetVerificationRecord | null;
  /**
   * 값이 바뀌어 옛 기록이 떨어져 나갔는가.
   * 화면이 "값을 고친 뒤 아직 확인하지 않았다"고 말할 수 있게 구분해 둔다.
   */
  staleByValueChange: boolean;
}

/**
 * 값 스냅샷을 비교 가능한 문자열로 만든다.
 *
 * 폼은 빈 칸을 `""`로 보내고 DB는 `NULL`을 돌려주므로 정규화 없이는 같은 값도 매번
 * 달라 보인다. 저장·비교 양쪽이 이 함수를 쓴다.
 */
export function vetValueSnapshot(...parts: (string | null | undefined)[]): string {
  return parts.map((part) => (part ?? "").trim()).join("");
}

/** 서비스 항목(영어 응대·야간 진료)의 스냅샷. 상태와 조건 문구가 함께 값을 이룬다. */
export function serviceSnapshot(
  status: VetServiceStatus,
  condition: string | null | undefined,
): string {
  // 조건 문구는 CONDITIONAL일 때만 값의 일부다. 다른 상태에서는 화면에 나오지 않으므로
  // 그 문구가 바뀌었다고 확인 근거를 떨어뜨리지 않는다.
  return vetValueSnapshot(status, status === "CONDITIONAL" ? condition : "");
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** 확인 시각으로부터 지난 일수. 미래 시각은 0일로 본다(장소 규칙과 같다). */
export function daysSinceVerified(verifiedAt: Date, referenceDate: Date): number {
  const diff = referenceDate.getTime() - verifiedAt.getTime();
  if (Number.isNaN(diff)) return Number.POSITIVE_INFINITY;
  if (diff < 0) return 0;
  return Math.floor(diff / MS_PER_DAY);
}

/** 병원 기준 재확인 필요 여부 (D-18). 경계일(30일째)부터 필요하다. */
export function vetNeedsRecheck(verifiedAt: Date, referenceDate: Date): boolean {
  return daysSinceVerified(verifiedAt, referenceDate) >= VET_RECHECK_AFTER_DAYS;
}

/**
 * 한 항목의 상태를 읽는다.
 *
 * @param currentSnapshot 지금 저장된 값의 스냅샷. `null`이면 값 대조를 하지 않는다
 *   (BASIC처럼 여러 필드를 묶어 보는 항목도 스냅샷을 만들어 넘긴다).
 */
export function resolveVetItem(
  target: VetVerificationTarget,
  currentSnapshot: string | null,
  records: readonly VetVerificationRecord[],
  referenceDate: Date,
): VetItemState {
  const forTarget = records
    .filter((record) => record.target === target)
    .sort((a, b) => b.verifiedAt.getTime() - a.verifiedAt.getTime());

  if (forTarget.length === 0) {
    return { confirmed: false, needsRecheck: false, evidence: null, staleByValueChange: false };
  }

  const matches = (record: VetVerificationRecord) =>
    currentSnapshot === null ||
    record.verifiedValue === null ||
    record.verifiedValue === currentSnapshot;

  const evidence = forTarget.find(matches) ?? null;

  if (!evidence) {
    // 기록은 있는데 전부 다른 값을 확인한 것이다. 값을 고친 뒤 다시 확인하지 않았다.
    return { confirmed: false, needsRecheck: false, evidence: null, staleByValueChange: true };
  }

  const stale = vetNeedsRecheck(evidence.verifiedAt, referenceDate);
  return {
    confirmed: !stale,
    needsRecheck: stale,
    evidence,
    staleByValueChange: false,
  };
}

/**
 * `안내 확인` 필터가 통과시키는 조건 (결정 D-19).
 *
 * 가능·조건부이면서 **현재 값을 뒷받침하는 기한 내 근거**가 있어야 한다.
 * 불가·미확인·재확인 기한 경과는 제외한다. 조건부는 제외하지 않고 조건을 함께 보여준다.
 * D-03·D-12(긍정 조건 필터는 확인된 일치 값만)를 병원 항목에 적용한 것이다.
 */
export function isServiceConfirmed(status: VetServiceStatus, item: VetItemState): boolean {
  if (status !== "AVAILABLE" && status !== "CONDITIONAL") return false;
  return item.confirmed;
}
