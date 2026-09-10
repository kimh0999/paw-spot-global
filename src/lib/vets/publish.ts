import { serviceSnapshot, vetValueSnapshot, type VetVerificationRecord } from "./verification";
import { resolveVetItem } from "./verification";

/**
 * 공개 기준 (결정 D-20).
 *
 * **기본 정보에만 건다.** 병원명·주소·전화가 있고 BASIC 항목에 유효한 확인 근거가 있어야
 * `VISIBLE`로 둘 수 있다. 영어 응대·야간 진료가 미확인이어도 공개를 막지 않는다 —
 * 확인된 범위를 보여주는 것이 이 서비스의 방침이고, 미확인을 이유로 연락처까지 숨기면
 * 사용자가 병원에 전화할 길이 사라진다(계획서 §5).
 *
 * 폼과 서버가 같은 함수를 쓴다. 두 곳이 다른 기준을 갖지 않게 한다.
 */

export interface PublishCandidate {
  nameKr: string;
  address: string;
  phone: string;
  records: readonly VetVerificationRecord[];
}

export type PublishBlocker = "nameKr" | "address" | "phone" | "basicVerification";

/** BASIC 항목이 확인하는 값의 스냅샷. 이 세 값 중 하나라도 바뀌면 근거가 떨어진다. */
export function basicSnapshot(input: {
  nameKr: string;
  address: string;
  phone: string;
}): string {
  return vetValueSnapshot(input.nameKr, "|", input.address, "|", input.phone);
}

/** 공개를 막는 이유를 모두 돌려준다. 비어 있으면 공개할 수 있다. */
export function findPublishBlockers(
  candidate: PublishCandidate,
  referenceDate: Date,
): PublishBlocker[] {
  const blockers: PublishBlocker[] = [];

  if (!candidate.nameKr.trim()) blockers.push("nameKr");
  if (!candidate.address.trim()) blockers.push("address");
  if (!candidate.phone.trim()) blockers.push("phone");

  const basic = resolveVetItem(
    "BASIC",
    basicSnapshot(candidate),
    candidate.records,
    referenceDate,
  );
  // 재확인 기한이 지난 것만으로는 공개를 막지 않는다(D-18) — 근거가 아예 없거나
  // 값이 바뀌어 떨어져 나간 경우만 막는다.
  if (!basic.evidence) blockers.push("basicVerification");

  return blockers;
}

export function canPublishClinic(
  candidate: PublishCandidate,
  referenceDate: Date,
): boolean {
  return findPublishBlockers(candidate, referenceDate).length === 0;
}

export { serviceSnapshot };
