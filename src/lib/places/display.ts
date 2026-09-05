import { parseVerifiedAt } from "./filtering";

// Info is considered "stale" once the last check is at least this many weeks old.
// Keep this high enough that the warning stays rare — if every place is amber, nothing stands out.
export const STALE_VERIFICATION_WEEKS = 8;

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

export function weeksSinceVerified(
  verifiedAt: string | null,
  referenceDate: Date,
): number | null {
  if (!verifiedAt) return null;
  const diffMs = referenceDate.getTime() - parseVerifiedAt(verifiedAt).getTime();
  if (diffMs < 0) return 0;
  return Math.floor(diffMs / MS_PER_WEEK);
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
