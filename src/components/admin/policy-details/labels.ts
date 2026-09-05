import { PREPARATION_ITEMS, type PreparationItem } from "@/lib/places/policy-details";

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

/**
 * 새로 체크할 수 있는 준비물.
 *
 * 배변봉투는 위쪽 "필요 준비물" 체크박스(`requiredItems`)가 이미 관리하는데
 * 두 값을 맞춰 주는 정합성 규칙이 없다. 새 데이터에서 어긋나지 않도록 여기서는 제외한다.
 * 이미 저장된 값에는 그대로 보이며 해제할 수 있다.
 */
export const SELECTABLE_PREPARATION_ITEMS: PreparationItem[] = PREPARATION_ITEMS.filter(
  (item) => item !== "POOP_BAG",
);

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
