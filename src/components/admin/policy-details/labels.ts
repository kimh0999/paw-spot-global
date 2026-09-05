/**
 * 관리자 폼에 쓰는 한국어 라벨.
 *
 * 운영자는 안내문을 읽고 옮겨 적는 사람이라 데이터 모델 용어(그룹·관계·enum)를 노출하지 않는다.
 * 이 화면은 운영자 전용이라 기존 PlaceForm과 같이 한국어를 그대로 둔다
 * (폼 i18n은 PROJECT_STATUS §15의 별도 과제다).
 */

/** 체크한 항목이 2개 이상일 때만 묻는다. 1개면 관계라는 개념 자체를 보여주지 않는다. */
export const GROUP_MODE_LABELS: Record<string, string> = {
  ALL_OF: "모두 필요",
  ANY_OF: "하나만 필요",
  UNKNOWN: "확인 필요",
};

export const PREPARATION_SCOPE_LABELS: Record<string, string> = {
  ALWAYS: "항상",
  INDOOR: "실내 동반 시에만",
  UNKNOWN: "확인 필요",
};

export const PREPARATION_ITEM_LABELS: Record<string, string> = {
  LEASH: "목줄",
  CARRIER: "이동가방",
  CRATE: "케이지",
  STROLLER: "유모차",
  MUZZLE: "입마개",
  PET_SEAT: "전용 의자",
  VACCINATION_PROOF: "예방접종 증빙",
  POOP_BAG: "배변봉투",
};

export const PREPARATION_STATUS_LABELS: Record<string, string> = {
  REQUIRED: "반드시 챙겨야 함",
  RECOMMENDED: "챙기면 좋음",
  ALLOWED: "가져와도 됨",
  NOT_REQUIRED: "안 챙겨도 됨(확인함)",
  UNKNOWN: "확인 필요",
};

/** 매장 안에서의 상태. 모두 "-기"로 끝나 뒤에 붙는 조사가 한 가지로 정해진다. */
export const HANDLING_RULE_LABELS: Record<string, string> = {
  FREE_ROAM: "자유롭게 다니기",
  HELD_BY_OWNER: "보호자가 안고 있기",
  PET_SEAT: "전용 의자에 앉히기",
  IN_CARRIER: "이동장 안에 있기",
  ON_LEASH_FLOOR: "목줄 매고 바닥 보행하기",
  ON_CHAIR_OR_TABLE: "의자·테이블 위에 올리기",
};

/** 준비물과 달리 실외가 있다. 실내와 실외에 서로 다른 상태를 요구하는 안내문이 실제로 있다. */
export const HANDLING_SCOPE_LABELS: Record<string, string> = {
  ALWAYS: "항상",
  INDOOR: "실내에서만",
  OUTDOOR: "실외에서만",
  UNKNOWN: "확인 필요",
};

export const HANDLING_STATUS_LABELS: Record<string, string> = {
  REQUIRED: "반드시 그래야 함",
  ALLOWED: "해도 됨",
  PROHIBITED: "하면 안 됨",
  CONDITIONAL: "상황에 따라",
  UNKNOWN: "확인 필요",
};

export const SPACE_AREA_LABELS: Record<string, string> = {
  INDOOR: "실내",
  OUTDOOR: "실외",
  TERRACE: "테라스",
  FLOOR: "특정 층",
  OTHER: "그 밖의 구역",
};

export const SPACE_ACCESS_LABELS: Record<string, string> = {
  ALLOWED: "출입 가능",
  NOT_ALLOWED: "출입 불가",
  UNKNOWN: "확인 필요",
};

/** 공간 예외·요금이 어떤 크기의 반려견에 적용되는지. */
export const SIZE_SCOPE_LABELS: Record<string, string> = {
  ALL: "크기 무관",
  SMALL: "소형견",
  MEDIUM: "중형견",
  LARGE: "대형견",
};

export const BEHAVIOR_TRIGGER_LABELS: Record<string, string> = {
  BARKING: "짖음",
  AGGRESSION: "공격성",
  UNCONTROLLED: "통제가 어려움",
  DISTURBING_OTHERS: "다른 손님에게 방해",
};

/** "현장 제한 가능"과 "입장 자체 불가"는 방문자에게 전혀 다른 뜻이라 합치지 않는다. */
export const BEHAVIOR_OUTCOME_LABELS: Record<string, string> = {
  MAY_RESTRICT: "현장에서 이용이 제한될 수 있음",
  NO_ENTRY: "입장 불가",
  UNKNOWN: "확인 필요",
};

export const FEE_POLICY_LABELS: Record<string, string> = {
  FREE: "무료",
  PAID: "유료",
  UNKNOWN: "확인 필요",
};

export const FEE_PERIOD_LABELS: Record<string, string> = {
  ALL: "상시",
  WEEKDAY: "평일",
  WEEKEND_HOLIDAY: "주말·공휴일",
};

export const HYGIENE_RULE_LABELS: Record<string, string> = {
  POOP_OWNER_HANDLES: "배변은 보호자가 치우기",
  POOP_DESIGNATED_DISPOSAL: "지정된 곳에만 배변 처리하기",
  PET_DISHES_ONLY: "반려견 전용 식기만 사용하기",
  SUPERVISION_REQUIRED: "보호자가 항상 함께 있기",
  OWNER_LIABILITY: "사고 발생 시 보호자 책임",
};

export const UNCERTAINTY_TARGET_LABELS: Record<string, string> = {
  INDOOR: "실내 동반",
  MAX_DOG_SIZE: "최대 크기",
  BREED_RESTRICTIONS: "견종 제한",
  CARRIER_STROLLER: "이동장·유모차",
  LEASH: "목줄",
  MUZZLE: "입마개",
  VACCINATION_CERTIFICATE: "예방접종 증빙",
  VACCINATION_COMPLETION: "예방접종 완료",
  PREPARATION: "준비물",
  HANDLING: "매장 내 상태",
  SPACE: "공간 예외",
  BEHAVIOR: "행동 제한",
  ADMISSION: "입장료",
  HYGIENE: "위생·책임",
};

export const VACCINATION_COMPLETION_LABELS: Record<string, string> = {
  REQUIRED: "접종 완료한 반려견만 입장 가능",
  NOT_REQUIRED: "완료 요구 없음(확인됨)",
  UNKNOWN: "확인 필요",
};
