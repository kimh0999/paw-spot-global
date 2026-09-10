/**
 * 동물병원 도메인 상수 (결정 D-16 ~ D-20).
 * 일반 장소(`lib/places`)와 값을 공유하지 않는다 — 병원은 동반 조건 판정 대상이 아니다.
 */

/** 대전 자치구. 시범 운영 지역이며 확장 시 이 목록을 늘린다. */
export const VET_DISTRICTS = ["dong", "jung", "seo", "yuseong", "daedeok"] as const;
export type VetDistrict = (typeof VET_DISTRICTS)[number];

export function isVetDistrict(value: string): value is VetDistrict {
  return (VET_DISTRICTS as readonly string[]).includes(value);
}

export const VET_SERVICE_STATUSES = [
  "AVAILABLE",
  "CONDITIONAL",
  "UNAVAILABLE",
  "UNKNOWN",
] as const;
export type VetServiceStatus = (typeof VET_SERVICE_STATUSES)[number];

export const VET_VERIFICATION_TARGETS = [
  "BASIC",
  "HOURS",
  "ENGLISH_SUPPORT",
  "AFTER_HOURS",
] as const;
export type VetVerificationTarget = (typeof VET_VERIFICATION_TARGETS)[number];

/**
 * 재확인 경계 (결정 D-18).
 *
 * **일반 장소의 90일과 다른 값이다.** 병원의 진료시간·야간 진료·영어 응대는 장소의 동반
 * 조건보다 자주 바뀐다는 운영 가설에서 나온 값이며, 규정이나 보장 기준이 아니다.
 * `lib/places/display.ts`의 `RECHECK_AFTER_DAYS`(90)는 그대로 둔다.
 */
export const VET_RECHECK_AFTER_DAYS = 30;

/** 조건부 상태에 반드시 따라와야 하는 조건 문구의 최대 길이. */
export const VET_CONDITION_MAX_LENGTH = 200;
