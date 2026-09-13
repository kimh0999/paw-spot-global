/**
 * 확인일 문자열을 로컬 날짜로 옮긴다.
 *
 * **`latestVerifiedAt`은 타임스탬프가 아니라 날짜 전용 값이다.** 원본
 * `Verification.verifiedAt`(timestamptz)을 `queries.ts`의 `formatVerifiedAt`이 서버
 * 로컬 타임존 기준으로 `YYYY.MM.DD` 문자열로 굳혀 내려보낸다. 여기서는 그 문자열을
 * 같은 로컬 타임존의 **자정(00:00)** 으로 되돌린다.
 *
 * 그래서 경과일 계산은 `확인한 날의 자정`과 `지금 이 순간`의 차이이며, 재확인 배지와
 * `최근 확인된 정보` 필터가 **이 함수 하나를 공유**한다(D-21·D-02).
 * 여기 있는 이유는 `filtering.ts`가 `needsRecheck`를 부르기 때문이다 — 반대 방향으로
 * 두면 두 모듈이 서로를 import한다.
 */
export function parseVerifiedAt(verifiedAt: string): Date {
  const [year, month, day] = verifiedAt.split(".").map(Number);
  return new Date(year, month - 1, day);
}

/**
 * 재확인이 필요해지는 경계 (결정 D-02).
 *
 * 8주(56일) 임계는 폐기했다. 56일과 90일은 사용자가 다르게 행동할 근거가 없는 차이였다.
 * 중간 경고 단계도 두지 않는다 — 경고가 흔해지면 아무것도 강조하지 못한다.
 *
 * 경계는 **90일 이상 지났을 때**다. 정확히 90일째부터 재확인 대상이다
 * (`DESIGN.md` v1.2.1 §6·§7).
 */
export const RECHECK_AFTER_DAYS = 90;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * 마지막 확인일로부터 지난 일수. **경과 시간 표시용**이며 재확인 판정과는 분리한다.
 *
 * 확인일이 없거나 읽을 수 없는 형식이면 `null`을 준다. 미래 날짜는 0일로 본다(기존 정책).
 */
export function daysSinceVerified(
  verifiedAt: string | null,
  referenceDate: Date,
): number | null {
  if (!verifiedAt) return null;

  const verified = parseVerifiedAt(verifiedAt);
  if (Number.isNaN(verified.getTime())) return null;

  const diffMs = referenceDate.getTime() - verified.getTime();
  if (diffMs < 0) return 0;
  return Math.floor(diffMs / MS_PER_DAY);
}

/**
 * 재확인이 필요한가 (`Recheck needed` 배지를 띄울지).
 *
 * 확인일을 모르면 **재확인 대상으로 본다.** 확인되지 않은 것을 확인된 것처럼 다루지 않는다는
 * 이 프로젝트의 원칙(`eligibility.ts`·조건 필터)을 신선도에도 그대로 적용한다.
 */
export function needsRecheck(
  verifiedAt: string | null,
  referenceDate: Date,
): boolean {
  const days = daysSinceVerified(verifiedAt, referenceDate);
  if (days === null) return true;
  return days >= RECHECK_AFTER_DAYS;
}

// verificationMethod arrives already mapped to a stable English label (queries.ts).
// Map it to an i18n subkey so the UI shows a human-readable phrase, not a raw code.
const VERIFICATION_METHOD_KEYS: Record<string, string> = {
  Phone: "phone",
  DM: "dm",
  Website: "website",
  "On-site": "onSite",
  "User report": "userReport",
};

export function verificationMethodKey(method: string | null): string | null {
  if (!method) return null;
  return VERIFICATION_METHOD_KEYS[method] ?? null;
}

/**
 * 예방접종 증빙 요약 행을 보여줄지.
 *
 * 확인되지 않은 값(`unknown`·값 없음)은 행 자체를 만들지 않는다. "매장 확인 필요"로 채우면
 * 확인된 조건과 같은 무게로 읽히기 때문이다(기획서 v3 §6-4).
 *
 * 이 행은 **증빙 지참**(`vaccinationCertificatePolicy`) 조건이다. 구조화 상세 조건의
 * **접종 완료 요구**(`policyDetails.entry`)는 다른 값이라 그쪽 문장은 이 규칙과 무관하게 남는다.
 */
export function showsVaccinationRow(policy: string | null | undefined): boolean {
  return policy === "required" || policy === "not_required";
}
