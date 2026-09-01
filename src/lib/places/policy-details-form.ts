import {
  EMPTY_POLICY_DETAILS,
  policyDetailsSchema,
  readPolicyDetails,
  type PolicyDetails,
} from "@/lib/places/policy-details";

/**
 * 관리자 폼이 보내는 구조화 상세 조건을 읽고 기존 값 위에 병합한다.
 *
 * 편집기는 아직 `entry` · `preparation` · `handling` · `uncertainties` 4개만 다룬다.
 * 나머지 필드(`spaceExceptions` · `behaviorRestrictions` · `admission` · `hygiene`)는
 * **화면에 없으므로 클라이언트로 내려보내지 않고 저장 시점에 DB 값을 그대로 잇는다.**
 * 편집하지 않는 JSON을 hidden input으로 왕복시키면 폼을 연 뒤 다른 사람이 고친 값을
 * 옛 값으로 되돌리게 되고, 조작 표면도 넓어진다.
 */

/** 편집기가 렌더링됐다는 신호. 이 값이 없으면 "미제출"이라 기존 JSON을 통째로 둔다. */
export const POLICY_DETAILS_SUBMITTED_FIELD = "condition.policyDetails.submitted";

const PREFIX = "condition.policyDetails";

/**
 * 폼이 보낸 편집 대상 4개 필드.
 *
 * 값은 아직 검증되지 않았다 — enum·길이·조합 검사는 병합이 끝난 **전체 객체**를
 * `policyDetailsSchema`로 한 번에 한다. 전체 스키마를 partial로 약화하지 않기 위해서다.
 */
export type PolicyDetailsFormInput = {
  entry: unknown;
  preparation: unknown[];
  handling: unknown[];
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
      rules: indices(formData, `${base}.rules.`).map((i) => ({
        rule: text(formData, `${base}.rules.${i}.rule`),
        status: text(formData, `${base}.rules.${i}.status`),
      })),
    };
  });
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
    uncertainties: parseUncertainties(formData),
  };
}

export type PolicyDetailsFailure = "invalidExisting" | "invalidInput";

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

  return { write: { policyDetails: parsed.data }, effective: parsed.data };
}
