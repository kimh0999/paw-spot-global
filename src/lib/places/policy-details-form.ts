import {
  EMPTY_POLICY_DETAILS,
  policyDetailsSchema,
  readPolicyDetails,
  type PolicyDetails,
} from "@/lib/places/policy-details";

/**
 * 관리자 폼이 보내는 구조화 상세 조건을 읽고 기존 값 위에 병합한다.
 *
 * 편집기가 8개 그룹을 모두 다루므로 제출값이 그룹 전체를 정한다. 제출 신호가 없으면
 * (편집기를 열지 않았거나 편집을 취소했으면) 기존 JSON을 통째로 그대로 둔다 —
 * "빈 그룹 제출"과 "미제출"은 다른 뜻이다.
 *
 * 값은 여전히 hidden JSON으로 왕복시키지 않고 필드 단위로만 오간다. 병합의 기준은
 * 저장 시점에 읽은 DB 값이며, 그래서 `version`처럼 화면에 없는 필드가 유지된다.
 */

/** 편집기가 렌더링됐다는 신호. 이 값이 없으면 "미제출"이라 기존 JSON을 통째로 둔다. */
export const POLICY_DETAILS_SUBMITTED_FIELD = "condition.policyDetails.submitted";

const PREFIX = "condition.policyDetails";

/**
 * 폼이 보낸 8개 그룹.
 *
 * 값은 아직 검증되지 않았다 — enum·길이·조합 검사는 병합이 끝난 **전체 객체**를
 * `policyDetailsSchema`로 한 번에 한다. 전체 스키마를 partial로 약화하지 않기 위해서다.
 */
export type PolicyDetailsFormInput = {
  entry: unknown;
  preparation: unknown[];
  handling: unknown[];
  spaceExceptions: unknown[];
  behaviorRestrictions: unknown[];
  /** 입장료는 nullable이다. 화면에서 입력을 시작하지 않았으면 null(다루지 않음)이다. */
  admission: unknown;
  hygiene: unknown[];
  uncertainties: unknown[];
};

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/** 값이 비어 있으면 키 자체를 넣지 않는다. optional 필드에 ""가 들어가 검증을 깨뜨리지 않게. */
function optionalText(formData: FormData, key: string): string | undefined {
  const value = text(formData, key);
  return value.length > 0 ? value : undefined;
}

/**
 * 숫자 칸을 읽는다. 비어 있으면 undefined — 0으로 바꾸지 않는다.
 * 빈 금액을 0원으로 저장하면 "무료"라는 없는 사실이 생긴다.
 * 숫자가 아닌 값은 NaN 그대로 넘겨 스키마에서 걸리게 한다.
 */
function optionalNumber(formData: FormData, key: string): number | undefined {
  const value = text(formData, key);
  return value.length > 0 ? Number(value) : undefined;
}

/**
 * `prefix.{n}.` 형태로 등장하는 인덱스를 오름차순으로 모은다.
 * 번호가 비어 있어도(삭제 후 남은 구멍) 있는 것만 읽는다. 하위 필드가 빠진 인덱스는
 * 빈 문자열이 되어 enum 검증에서 걸린다 — 조용히 건너뛰지 않는다.
 */
function indices(formData: FormData, prefix: string): number[] {
  const found = new Set<number>();
  formData.forEach((_value, key) => {
    if (!key.startsWith(prefix)) return;
    const matched = /^(\d+)\./.exec(key.slice(prefix.length));
    if (matched) found.add(Number(matched[1]));
  });
  return Array.from(found).sort((a, b) => a - b);
}

function parsePreparation(formData: FormData): unknown[] {
  return indices(formData, `${PREFIX}.preparation.`).map((g) => {
    const base = `${PREFIX}.preparation.${g}`;
    return {
      mode: text(formData, `${base}.mode`),
      scope: text(formData, `${base}.scope`),
      items: indices(formData, `${base}.items.`).map((i) => ({
        item: text(formData, `${base}.items.${i}.item`),
        status: text(formData, `${base}.items.${i}.status`),
      })),
    };
  });
}

function parseHandling(formData: FormData): unknown[] {
  return indices(formData, `${PREFIX}.handling.`).map((g) => {
    const base = `${PREFIX}.handling.${g}`;
    return {
      mode: text(formData, `${base}.mode`),
      scope: text(formData, `${base}.scope`),
      rules: indices(formData, `${base}.rules.`).map((i) => ({
        rule: text(formData, `${base}.rules.${i}.rule`),
        status: text(formData, `${base}.rules.${i}.status`),
      })),
    };
  });
}

function parseSpaceExceptions(formData: FormData): unknown[] {
  return indices(formData, `${PREFIX}.spaceExceptions.`).map((i) => {
    const base = `${PREFIX}.spaceExceptions.${i}`;
    return {
      area: text(formData, `${base}.area`),
      // 층·구역 이름은 해당 구역에서만 쓴다. 화면도 그때만 칸을 보여준다.
      floor: optionalNumber(formData, `${base}.floor`),
      label: optionalText(formData, `${base}.label`),
      appliesToSize: text(formData, `${base}.appliesToSize`),
      access: text(formData, `${base}.access`),
    };
  });
}

function parseBehaviorRestrictions(formData: FormData): unknown[] {
  return indices(formData, `${PREFIX}.behaviorRestrictions.`).map((i) => {
    const base = `${PREFIX}.behaviorRestrictions.${i}`;
    return {
      trigger: text(formData, `${base}.trigger`),
      outcome: text(formData, `${base}.outcome`),
    };
  });
}

/**
 * 입장료. 신호가 없으면 null이다 — "무료"가 아니라 "다루지 않음"이다.
 * 포함 서비스는 빈 칸을 걸러낸다. 빈 문자열은 스키마가 거부하는데, 지우다 만 칸 때문에
 * 저장 전체가 막히는 편이 관리자에게 도움이 되지 않는다.
 */
function parseAdmission(formData: FormData): unknown {
  if (formData.get(`${PREFIX}.admission.present`) !== "true") return null;

  const base = `${PREFIX}.admission`;
  return {
    feePolicy: text(formData, `${base}.feePolicy`),
    rates: indices(formData, `${base}.rates.`).map((i) => ({
      period: text(formData, `${base}.rates.${i}.period`),
      amountKrw: optionalNumber(formData, `${base}.rates.${i}.amountKrw`),
      dogSize: text(formData, `${base}.rates.${i}.dogSize`),
    })),
    includedServices: formData
      .getAll(`${base}.includedServices`)
      .map((value) => String(value).trim())
      .filter((value) => value.length > 0),
  };
}

function parseHygiene(formData: FormData): unknown[] {
  return formData.getAll(`${PREFIX}.hygiene`).map((value) => String(value));
}

function parseUncertainties(formData: FormData): unknown[] {
  return indices(formData, `${PREFIX}.uncertainties.`).map((i) => {
    const base = `${PREFIX}.uncertainties.${i}`;
    return {
      target: text(formData, `${base}.target`),
      reason: text(formData, `${base}.reason`),
      quote: optionalText(formData, `${base}.quote`),
      question: optionalText(formData, `${base}.question`),
    };
  });
}

/**
 * 편집기가 제출되지 않았으면 `undefined`를 돌려준다 — "변경 없음"이다.
 * 제출됐는데 그룹이 비어 있으면 빈 배열이 되어 그 그룹만 초기화된다.
 * 둘을 구분해야 폼을 거치지 않는 저장이 기존 조건을 지우지 않는다.
 */
export function parsePolicyDetailsForm(
  formData: FormData,
): PolicyDetailsFormInput | undefined {
  if (formData.get(POLICY_DETAILS_SUBMITTED_FIELD) !== "true") return undefined;

  return {
    entry: {
      vaccinationCompletionPolicy: text(
        formData,
        `${PREFIX}.entry.vaccinationCompletionPolicy`,
      ),
    },
    preparation: parsePreparation(formData),
    handling: parseHandling(formData),
    spaceExceptions: parseSpaceExceptions(formData),
    behaviorRestrictions: parseBehaviorRestrictions(formData),
    admission: parseAdmission(formData),
    hygiene: parseHygiene(formData),
    uncertainties: parseUncertainties(formData),
  };
}

export type PolicyDetailsFailure =
  | "invalidExisting"
  | "invalidInput"
  | "handlingMultiNotRequired"
  | "spaceDuplicate"
  | "behaviorDuplicate"
  | "admissionInconsistent";

/** 실패 이유별 관리자 안내 메시지 키(`admin.places.form.validation`). */
export const POLICY_DETAILS_ERROR_MESSAGE_KEY: Record<PolicyDetailsFailure, string> = {
  invalidExisting: "policyDetailsCorrupted",
  invalidInput: "policyDetailsInvalid",
  handlingMultiNotRequired: "policyDetailsHandlingMultiNotRequired",
  spaceDuplicate: "policyDetailsSpaceDuplicate",
  behaviorDuplicate: "policyDetailsBehaviorDuplicate",
  admissionInconsistent: "policyDetailsAdmissionInconsistent",
};

/** 저장을 멈춰야 하는 상황. 관리자에게 무엇이 잘못됐는지 알리려고 이유를 구분한다. */
export class PolicyDetailsWriteError extends Error {
  constructor(
    readonly reason: PolicyDetailsFailure,
    readonly issues: string[],
  ) {
    super(`policyDetails ${reason}: ${issues.join(", ")}`);
    this.name = "PolicyDetailsWriteError";
  }
}

/**
 * 스키마가 잡지 못하는 의미 충돌.
 *
 * 값 하나하나는 올바른데 조합이 뜻을 뒤집거나 어느 쪽이 사실인지 알 수 없게 만드는 경우다.
 * 관리자 화면이 같은 규칙으로 먼저 막지만 폼을 거치지 않는 입력도 있으므로 여기서 다시 본다.
 */
type Violation = { reason: PolicyDetailsFailure; issue: string };

/**
 * 행동을 2개 이상 묶은 조건은 전부 "반드시 그래야 함"일 때만 허용한다.
 *
 * 금지·허용·조건부를 한 묶음에 넣으면 "A해야 하거나 B해서는 안 됩니다"처럼 앞 절이
 * 요구로 읽혀 뜻이 뒤집힌다. 묶음의 관계(모두/하나)는 요구에만 의미가 있으므로
 * 금지·허용·조건부는 조건을 하나씩 나눠 입력한다.
 */
function findHandlingViolations(handling: PolicyDetails["handling"]): Violation[] {
  return handling.flatMap((group, index) =>
    group.rules.length > 1 && group.rules.some((rule) => rule.status !== "REQUIRED")
      ? [
          {
            reason: "handlingMultiNotRequired" as const,
            issue: `handling.${index}: 행동 2개 이상은 모두 REQUIRED여야 합니다`,
          },
        ]
      : [],
  );
}

/**
 * 같은 대상에 두 번 답한 항목을 찾는다.
 *
 * 두 답이 다르면 어느 쪽이 사실인지 알 수 없고, 같으면 화면에 같은 문장이 두 번 나온다.
 * 자동으로 하나를 고르지 않고 관리자에게 정리를 요청한다.
 */
function findDuplicates<T>(items: T[], key: (item: T) => string): number[] {
  const seen = new Map<string, number>();
  const duplicated: number[] = [];
  items.forEach((item, index) => {
    const value = key(item);
    if (seen.has(value)) duplicated.push(index);
    else seen.set(value, index);
  });
  return duplicated;
}

/** 공간 예외를 구분하는 값. 화면의 중복 표시도 이 키를 쓴다. */
export function spaceExceptionKey(
  item: PolicyDetails["spaceExceptions"][number],
): string {
  return [item.area, item.floor ?? "", item.label?.trim() ?? "", item.appliesToSize].join(
    "|",
  );
}

/** 요금 한 줄을 구분하는 값. 금액은 빼야 "같은 조건에 다른 금액"이 중복으로 잡힌다. */
export function admissionRateKey(rate: {
  period: string;
  dogSize: string;
}): string {
  return `${rate.period}|${rate.dogSize}`;
}

function findSpaceViolations(items: PolicyDetails["spaceExceptions"]): Violation[] {
  return findDuplicates(items, spaceExceptionKey).map((index) => ({
    reason: "spaceDuplicate" as const,
    issue: `spaceExceptions.${index}: 같은 구역·크기가 두 번 입력됐습니다`,
  }));
}

function findBehaviorViolations(
  items: PolicyDetails["behaviorRestrictions"],
): Violation[] {
  return findDuplicates(items, (item) => item.trigger).map((index) => ({
    reason: "behaviorDuplicate" as const,
    issue: `behaviorRestrictions.${index}: 같은 상황이 두 번 입력됐습니다`,
  }));
}

/**
 * 요금 행은 "유료"일 때만 뜻이 통한다.
 *
 * 무료인데 금액이 있으면 스키마가 먼저 걸러내고(`freeWithRates`), 확인 필요인데 금액이
 * 있는 경우가 여기 남는다 — 금액을 안다면 유료라는 사실도 아는 것이다.
 */
function findAdmissionViolations(admission: PolicyDetails["admission"]): Violation[] {
  if (!admission) return [];

  const violations: Violation[] = [];
  if (admission.rates.length > 0 && admission.feePolicy !== "PAID") {
    violations.push({
      reason: "admissionInconsistent",
      issue: `admission: 요금이 있는데 feePolicy가 ${admission.feePolicy}입니다`,
    });
  }

  for (const index of findDuplicates(admission.rates, admissionRateKey)) {
    violations.push({
      reason: "admissionInconsistent",
      issue: `admission.rates.${index}: 같은 기간·크기가 두 번 입력됐습니다`,
    });
  }

  return violations;
}

function findViolations(details: PolicyDetails): Violation[] {
  return [
    ...findHandlingViolations(details.handling),
    ...findSpaceViolations(details.spaceExceptions),
    ...findBehaviorViolations(details.behaviorRestrictions),
    ...findAdmissionViolations(details.admission),
  ];
}

export type PolicyDetailsResolution = {
  /** placeCondition 저장 데이터에 펼칠 값. 비어 있으면 기존 JSON을 건드리지 않는다. */
  write: { policyDetails?: PolicyDetails };
  /** 저장 후 유효한 상세 조건. 조건 컬럼 요약 계산에 쓴다. */
  effective: PolicyDetails | null;
};

/**
 * 기존 값과 제출값을 합쳐 저장할 JSON을 정한다.
 *
 * - 제출이 없으면 기존 값을 그대로 둔다.
 * - 기존 값이 깨져 있으면 **덮어쓰지 않고 저장을 중단한다.** 빈 값으로 밀어버리면
 *   무엇이 있었는지 영영 알 수 없다.
 * - 기존 값이 없으면 공식 기본값 위에 병합한다.
 *
 * 초기화(`clearPolicyDetails`)는 이 함수 밖에서 먼저 처리한다 — 병합보다 우선이다.
 */
export function resolvePolicyDetails(
  existingRaw: unknown,
  submitted: PolicyDetailsFormInput | undefined,
): PolicyDetailsResolution {
  const existing = readPolicyDetails(existingRaw);

  if (submitted === undefined) {
    // 손대지 않으므로 깨진 값이어도 막지 않는다. 다만 요약 계산에는 쓰지 않는다.
    return { write: {}, effective: existing.status === "ok" ? existing.value : null };
  }

  if (existing.status === "invalid") {
    throw new PolicyDetailsWriteError("invalidExisting", existing.issues);
  }

  const base = existing.value ?? EMPTY_POLICY_DETAILS;
  const merged = {
    ...base,
    entry: submitted.entry,
    preparation: submitted.preparation,
    handling: submitted.handling,
    spaceExceptions: submitted.spaceExceptions,
    behaviorRestrictions: submitted.behaviorRestrictions,
    admission: submitted.admission,
    hygiene: submitted.hygiene,
    uncertainties: submitted.uncertainties,
  };

  const parsed = policyDetailsSchema.safeParse(merged);
  if (!parsed.success) {
    throw new PolicyDetailsWriteError(
      "invalidInput",
      parsed.error.issues.map(
        (issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`,
      ),
    );
  }

  // 이유가 여러 가지면 첫 번째 것으로 안내하고, 무엇이 걸렸는지는 모두 남긴다.
  const violations = findViolations(parsed.data);
  if (violations.length > 0) {
    throw new PolicyDetailsWriteError(
      violations[0].reason,
      violations.map((violation) => violation.issue),
    );
  }

  return { write: { policyDetails: parsed.data }, effective: parsed.data };
}
