import { z } from "zod";

/**
 * `PlaceCondition.policyDetails`에 담기는 복합 이용수칙.
 *
 * 이 JSON이 안내문 해석의 **정확한 원본**이다. PlaceCondition의 leash·muzzle·
 * carrierStrollerPolicy·vaccinationCertificatePolicy 컬럼은 필터·자동 매칭이 읽는
 * **보수적 요약값**이며, 두 값의 정합은 condition-consistency.ts가 쓰기 시점에 맞춘다.
 *
 * 값은 전부 닫힌 코드 목록이다. 범용 규칙 엔진이 아니라 아래 그룹만 표현한다.
 * 결정 근거는 docs/analysis-pet-conditions.md §C-2, §E-3(D-01·D-02·D-04).
 */

/**
 * 저장된 JSON의 형식 버전.
 * 값이 다르면 파싱이 실패하고 `readPolicyDetails`가 `invalid`로 알린다.
 * 형식을 바꿀 때는 이 값을 올리고 읽기 쪽에 이전 버전 변환을 추가한다.
 */
export const POLICY_DETAILS_VERSION = 1;

export const GROUP_MODES = ["ANY_OF", "ALL_OF", "UNKNOWN"] as const;
export type GroupMode = (typeof GROUP_MODES)[number];

/** 준비물 요구가 적용되는 범위. 원문 D "실내동반시 …필수"를 담는다. */
export const PREPARATION_SCOPES = ["ALWAYS", "INDOOR", "UNKNOWN"] as const;
export type PreparationScope = (typeof PREPARATION_SCOPES)[number];

// 방문 전에 보호자가 챙겨야 하는 물건.
// leash/muzzle 컬럼과 겹치는 항목이 있는 것은 의도적이다 — 컬럼은 필터·매칭 신호를,
// 여기 그룹은 "목줄 또는 이동가방"처럼 컬럼으로 못 쓰는 관계를 담는다.
export const PREPARATION_ITEMS = [
  "LEASH",
  "CARRIER",
  "CRATE",
  "STROLLER",
  "MUZZLE",
  "PET_SEAT",
  "VACCINATION_PROOF",
  "POOP_BAG",
] as const;
export type PreparationItem = (typeof PREPARATION_ITEMS)[number];

export const PREPARATION_STATUS = [
  "REQUIRED",
  "RECOMMENDED",
  "ALLOWED",
  "NOT_REQUIRED",
  "UNKNOWN",
] as const;
export type PreparationStatus = (typeof PREPARATION_STATUS)[number];

// 매장 안에서 반려견이 있어야 하는 상태. 준비물과 다른 개념이라 그룹을 나눈다.
// "유모차를 챙겨와라"(preparation)와 "유모차에 태워둬라"(handling)는 다른 조건이다.
export const HANDLING_RULES = [
  "FREE_ROAM",
  "HELD_BY_OWNER",
  "PET_SEAT",
  "IN_CARRIER",
  "ON_LEASH_FLOOR",
  "ON_CHAIR_OR_TABLE",
] as const;
export type HandlingRule = (typeof HANDLING_RULES)[number];

/**
 * 매장 내 상태가 적용되는 범위.
 *
 * 준비물(`PREPARATION_SCOPES`)과 달리 `OUTDOOR`가 있다. 실제 안내문이 실내와 실외에
 * 서로 다른 상태를 요구한다 — "실내에서는 안고 계세요 / 실외는 목줄만 하면 됩니다".
 * 범위가 없으면 두 문장이 한 화면에서 모순되게 읽힌다.
 */
export const HANDLING_SCOPES = ["ALWAYS", "INDOOR", "OUTDOOR", "UNKNOWN"] as const;
export type HandlingScope = (typeof HANDLING_SCOPES)[number];

export const HANDLING_STATUS = [
  "REQUIRED",
  "ALLOWED",
  "PROHIBITED",
  "CONDITIONAL",
  "UNKNOWN",
] as const;

export const SPACE_AREAS = ["INDOOR", "OUTDOOR", "TERRACE", "FLOOR", "OTHER"] as const;
export const SPACE_ACCESS = ["ALLOWED", "NOT_ALLOWED", "UNKNOWN"] as const;
/** 공간 예외가 적용되는 반려견 크기. ALL은 크기와 무관하게 적용된다는 뜻이다. */
export const SIZE_SCOPES = ["ALL", "SMALL", "MEDIUM", "LARGE"] as const;

export const BEHAVIOR_TRIGGERS = [
  "BARKING",
  "AGGRESSION",
  "UNCONTROLLED",
  "DISTURBING_OTHERS",
] as const;
/** MAY_RESTRICT(현장 제한 가능)와 NO_ENTRY(입장 자체 불가)를 합치지 않는다. */
export const BEHAVIOR_OUTCOMES = ["MAY_RESTRICT", "NO_ENTRY", "UNKNOWN"] as const;

export const FEE_POLICIES = ["FREE", "PAID", "UNKNOWN"] as const;
export const FEE_PERIODS = ["ALL", "WEEKDAY", "WEEKEND_HOLIDAY"] as const;

export const HYGIENE_RULES = [
  "POOP_OWNER_HANDLES",
  "POOP_DESIGNATED_DISPOSAL",
  "PET_DISHES_ONLY",
  "SUPERVISION_REQUIRED",
  "OWNER_LIABILITY",
] as const;

/** 불확실성을 붙일 수 있는 대상. 정식 컬럼과 보조 그룹을 모두 가리킨다. */
export const UNCERTAINTY_TARGETS = [
  "INDOOR",
  "MAX_DOG_SIZE",
  "BREED_RESTRICTIONS",
  "CARRIER_STROLLER",
  "LEASH",
  "MUZZLE",
  "VACCINATION_CERTIFICATE",
  "VACCINATION_COMPLETION",
  "PREPARATION",
  "HANDLING",
  "SPACE",
  "BEHAVIOR",
  "ADMISSION",
  "HYGIENE",
] as const;

/**
 * 매장이 "예방접종 완료"를 요구하는지에 대한 정책.
 * 개별 반려견의 접종 여부가 아니라 매장의 요구 사항이며,
 * "증빙 지참"(vaccinationCertificatePolicy 컬럼)과는 다른 조건이다.
 */
export const VACCINATION_COMPLETION_POLICIES = [
  "REQUIRED",
  "NOT_REQUIRED",
  "UNKNOWN",
] as const;
export type VaccinationCompletionPolicy =
  (typeof VACCINATION_COMPLETION_POLICIES)[number];

const preparationGroupSchema = z.strictObject({
  mode: z.enum(GROUP_MODES),
  scope: z.enum(PREPARATION_SCOPES),
  items: z
    .array(
      z.strictObject({
        item: z.enum(PREPARATION_ITEMS),
        status: z.enum(PREPARATION_STATUS),
      }),
    )
    .min(1)
    .max(PREPARATION_ITEMS.length),
});

const handlingGroupSchema = z.strictObject({
  mode: z.enum(GROUP_MODES),
  scope: z.enum(HANDLING_SCOPES),
  rules: z
    .array(
      z.strictObject({
        rule: z.enum(HANDLING_RULES),
        status: z.enum(HANDLING_STATUS),
      }),
    )
    .min(1)
    .max(HANDLING_RULES.length),
});

const spaceExceptionSchema = z
  .strictObject({
    area: z.enum(SPACE_AREAS),
    /** area가 FLOOR일 때만 쓴다. */
    floor: z.number().int().min(-5).max(50).optional(),
    /** area가 OTHER일 때 구역 이름. */
    label: z.string().min(1).max(100).optional(),
    appliesToSize: z.enum(SIZE_SCOPES),
    access: z.enum(SPACE_ACCESS),
  })
  .superRefine((value, ctx) => {
    if (value.area === "FLOOR" && value.floor == null) {
      ctx.addIssue({ code: "custom", message: "floorRequired", path: ["floor"] });
    }
    if (value.area === "OTHER" && !value.label) {
      ctx.addIssue({ code: "custom", message: "labelRequired", path: ["label"] });
    }
  });

const behaviorRestrictionSchema = z.strictObject({
  trigger: z.enum(BEHAVIOR_TRIGGERS),
  outcome: z.enum(BEHAVIOR_OUTCOMES),
});

const admissionSchema = z
  .strictObject({
    feePolicy: z.enum(FEE_POLICIES),
    rates: z
      .array(
        z.strictObject({
          period: z.enum(FEE_PERIODS),
          amountKrw: z.number().int().min(0).max(1_000_000),
          dogSize: z.enum(SIZE_SCOPES),
        }),
      )
      .max(9),
    /** 입장료에 포함된 서비스. 매장마다 달라 코드화할 수 없어 짧은 자유 텍스트로 둔다. */
    includedServices: z.array(z.string().min(1).max(100)).max(5),
  })
  .superRefine((value, ctx) => {
    if (value.feePolicy === "FREE" && value.rates.length > 0) {
      ctx.addIssue({ code: "custom", message: "freeWithRates", path: ["rates"] });
    }
  });

/** 확인되지 않은 항목. 무엇을 왜 모르는지와 매장에 물어볼 질문까지 남긴다. */
const uncertaintySchema = z.strictObject({
  target: z.enum(UNCERTAINTY_TARGETS),
  reason: z.string().min(1).max(300),
  /** 판단 근거가 된 안내문 원문 조각. */
  quote: z.string().min(1).max(500).optional(),
  question: z.string().min(1).max(300).optional(),
});

/**
 * 알 수 없는 키는 통과시키지 않는다(strict).
 * 오타나 옛 형식이 조용히 버려지면 "조건 없음"과 구별되지 않기 때문이다.
 */
export const policyDetailsSchema = z.strictObject({
  version: z.literal(POLICY_DETAILS_VERSION),
  entry: z.strictObject({
    vaccinationCompletionPolicy: z.enum(VACCINATION_COMPLETION_POLICIES),
  }),
  preparation: z.array(preparationGroupSchema).max(5),
  handling: z.array(handlingGroupSchema).max(5),
  spaceExceptions: z.array(spaceExceptionSchema).max(8),
  behaviorRestrictions: z.array(behaviorRestrictionSchema).max(BEHAVIOR_TRIGGERS.length),
  admission: admissionSchema.nullable(),
  hygiene: z.array(z.enum(HYGIENE_RULES)).max(HYGIENE_RULES.length),
  uncertainties: z.array(uncertaintySchema).max(12),
});

export type PolicyDetails = z.infer<typeof policyDetailsSchema>;

/** 아무것도 확인되지 않은 상태. UNKNOWN은 "제한 없음"이 아니라 "확인되지 않음"이다. */
export const EMPTY_POLICY_DETAILS: PolicyDetails = {
  version: POLICY_DETAILS_VERSION,
  entry: { vaccinationCompletionPolicy: "UNKNOWN" },
  preparation: [],
  handling: [],
  spaceExceptions: [],
  behaviorRestrictions: [],
  admission: null,
  hygiene: [],
  uncertainties: [],
};

/**
 * DB의 Json 컬럼을 읽은 결과.
 *
 * `empty`(아직 구조화되지 않음)와 `invalid`(값이 있는데 형식이 깨짐)를 구분한다.
 * 둘을 모두 null로 뭉개면 잘못된 데이터가 "조건 없음"처럼 보여 조용히 사라진다.
 */
export type PolicyDetailsRead =
  | { status: "empty"; value: null }
  | { status: "ok"; value: PolicyDetails }
  | { status: "invalid"; value: null; issues: string[] };

export function readPolicyDetails(value: unknown): PolicyDetailsRead {
  if (value == null) return { status: "empty", value: null };

  const parsed = policyDetailsSchema.safeParse(value);
  if (parsed.success) return { status: "ok", value: parsed.data };

  return {
    status: "invalid",
    value: null,
    issues: parsed.error.issues.map(
      (issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`,
    ),
  };
}
