import {
  IMAGE_LICENSE_TYPES,
  type ImageLicenseTypeValue,
} from "@/lib/places/constants";
import {
  blocksPublicImage,
  imageAttributionStatus,
  missingAttributionFields,
  type ImageAttributionField,
} from "@/lib/places/image-attribution";
import { safeHttpUrl } from "@/lib/validation/url";

/**
 * 관리자 폼이 보내는 이미지 출처를 읽고 DB에 쓸 모양으로 옮긴다 (결정 D-22).
 *
 * `policy-details-form.ts`와 같은 자리다 — 폼 파싱과 DB 병합 규칙을 액션·저장 로직에서
 * 떼어 두고, 같은 규칙을 만들기 스크립트와 공유한다.
 *
 * **검토는 승계되지 않는다.** 이미지 주소나 출처 내용이 바뀌면 이전 검토 기록은 지금
 * 이미지를 확인한 것이 아니므로 버린다. 다시 확인했다는 표시가 있을 때만 새로 기록한다.
 */

export interface ImageAttributionFormInput {
  provider: string;
  copyrightHolder: string;
  workTitle: string;
  createdYear: string;
  sourceUrl: string;
  licenseType: string;
  licenseUrl: string;
  /** 사람이 실제 이미지와 출처를 확인했다는 표시. 코드가 대신 채우지 않는다. */
  reviewed: boolean;
  /** 이 기록을 지운다. 이미지에 이용 조건이 없다고 확인했을 때만 쓴다. */
  clear: boolean;
}

/** DB에 저장할 값. 날짜는 호출부가 붙인다 — 저장 시점이 트랜잭션 안에 있어야 한다. */
export interface ImageAttributionData {
  imageUrl: string;
  provider: string;
  copyrightHolder: string | null;
  workTitle: string | null;
  createdYear: number | null;
  sourceUrl: string;
  licenseType: ImageLicenseTypeValue;
  licenseUrl: string | null;
}

export type ImageAttributionWrite =
  | { action: "delete" }
  | { action: "upsert"; data: ImageAttributionData; reviewed: boolean };

export type ImageAttributionFormError =
  | "providerRequired"
  | "sourceUrlRequired"
  | "invalidSourceUrl"
  | "invalidLicenseUrl"
  | "invalidLicenseType"
  | "invalidCreatedYear";

/** 폼 오류 → `admin.places.form.validation`의 메시지 키. */
export const IMAGE_ATTRIBUTION_ERROR_MESSAGE_KEY: Record<
  ImageAttributionFormError,
  string
> = {
  providerRequired: "imageAttributionProviderRequired",
  sourceUrlRequired: "imageAttributionSourceUrlRequired",
  invalidSourceUrl: "imageAttributionInvalidSourceUrl",
  invalidLicenseUrl: "imageAttributionInvalidLicenseUrl",
  invalidLicenseType: "imageAttributionInvalidLicenseType",
  invalidCreatedYear: "imageAttributionInvalidCreatedYear",
};

/** 폼이 쓰는 필드 이름. 액션이 오류를 여기에 붙이면 폼이 같은 자리에 표시한다. */
export const IMAGE_ATTRIBUTION_FIELD = "imageAttribution";

const PREFIX = "imageAttribution";

function text(formData: FormData, key: string): string {
  const value = formData.get(`${PREFIX}.${key}`);
  return typeof value === "string" ? value.trim() : "";
}

export function parseImageAttributionForm(formData: FormData): ImageAttributionFormInput {
  return {
    provider: text(formData, "provider"),
    copyrightHolder: text(formData, "copyrightHolder"),
    workTitle: text(formData, "workTitle"),
    createdYear: text(formData, "createdYear"),
    sourceUrl: text(formData, "sourceUrl"),
    licenseType: text(formData, "licenseType"),
    licenseUrl: text(formData, "licenseUrl"),
    reviewed: formData.get(`${PREFIX}.reviewed`) === "true",
    clear: formData.get(`${PREFIX}.clear`) === "true",
  };
}

function isEmpty(form: ImageAttributionFormInput): boolean {
  return (
    form.provider === "" &&
    form.copyrightHolder === "" &&
    form.workTitle === "" &&
    form.createdYear === "" &&
    form.sourceUrl === "" &&
    form.licenseUrl === "" &&
    (form.licenseType === "" || form.licenseType === "UNKNOWN")
  );
}

/**
 * 폼 입력 → 저장 지시.
 *
 * 이미지가 없으면 출처도 없다. 입력이 전부 비어 있으면 기록을 지운다 — "빈 기록"을
 * 남겨 두면 판정이 `missingRecord`가 아니라 `invalidSourceUrl`로 흐려진다.
 */
export function resolveImageAttributionWrite(
  thumbnailUrl: string | null,
  form: ImageAttributionFormInput,
): { write: ImageAttributionWrite } | { error: ImageAttributionFormError } {
  const image = safeHttpUrl(thumbnailUrl);
  if (form.clear || !image || isEmpty(form)) {
    // 이미지가 있는데 출처 입력만 비운 경우도 삭제다. 이용 조건이 필요한 이미지인지는
    // 공개 전환 검사(`imageAttributionStatus`)가 따로 잡는다.
    return { write: { action: "delete" } };
  }

  if (form.provider === "") return { error: "providerRequired" };
  if (form.sourceUrl === "") return { error: "sourceUrlRequired" };

  const sourceUrl = safeHttpUrl(form.sourceUrl);
  if (!sourceUrl) return { error: "invalidSourceUrl" };

  let licenseUrl: string | null = null;
  if (form.licenseUrl !== "") {
    licenseUrl = safeHttpUrl(form.licenseUrl);
    if (!licenseUrl) return { error: "invalidLicenseUrl" };
  }

  const licenseType = form.licenseType === "" ? "UNKNOWN" : form.licenseType;
  if (!(IMAGE_LICENSE_TYPES as readonly string[]).includes(licenseType)) {
    return { error: "invalidLicenseType" };
  }

  // 작성연도는 확인된 값만 받는다. 비어 있으면 NULL이고 수집 연도로 대신 채우지 않는다.
  let createdYear: number | null = null;
  if (form.createdYear !== "") {
    const parsed = Number(form.createdYear);
    if (!Number.isInteger(parsed) || parsed < 1800 || parsed > 2200) {
      return { error: "invalidCreatedYear" };
    }
    createdYear = parsed;
  }

  return {
    write: {
      action: "upsert",
      reviewed: form.reviewed,
      data: {
        imageUrl: image,
        provider: form.provider,
        copyrightHolder: form.copyrightHolder || null,
        workTitle: form.workTitle || null,
        createdYear,
        sourceUrl,
        licenseType: licenseType as ImageLicenseTypeValue,
        licenseUrl,
      },
    },
  };
}

/**
 * 이대로 저장하면 공개 화면에서 이미지가 막히는지 (결정 D-22).
 *
 * 공개(`VISIBLE`)로 바꾸는 저장에서만 부른다. 아직 쓰기 전이라 DB를 보지 않고
 * **저장될 값**으로 판정한다 — 확인 표시가 있으면 검토 시각이 생길 것이므로 통과한다.
 * `DRAFT`·`HIDDEN` 저장은 막지 않는다. 자료를 채워 가는 중에 저장을 못 하게 되면
 * 출처를 확인할 기회 자체가 사라진다.
 */
export function publishBlockedByImageAttribution(
  thumbnailUrl: string | null,
  write: ImageAttributionWrite,
  now: Date,
): { blocked: false } | { blocked: true; missing: ImageAttributionField[] } {
  const record =
    write.action === "upsert"
      ? { ...write.data, reviewedAt: write.reviewed ? now : null }
      : null;
  if (!blocksPublicImage(imageAttributionStatus(thumbnailUrl, record))) {
    return { blocked: false };
  }
  // 비어 있는 항목을 함께 돌려준다. "보완하세요"만으로는 어디를 채울지 알 수 없다.
  return {
    blocked: true,
    missing: record ? missingAttributionFields(thumbnailUrl, record) : [],
  };
}

/** 검토가 가리키는 대상. 하나라도 달라지면 이전 검토는 지금 이미지를 확인한 것이 아니다. */
export function attributionReviewTarget(data: ImageAttributionData): string {
  return JSON.stringify([
    data.imageUrl,
    data.provider,
    data.copyrightHolder,
    data.workTitle,
    data.createdYear,
    data.sourceUrl,
    data.licenseType,
    data.licenseUrl,
  ]);
}

/**
 * 저장할 검토 기록.
 *
 * 확인 표시가 없으면 비운다. 표시가 있어도 **같은 대상을 이미 검토했을 때만** 그때의
 * 기록을 잇는다 — 저장할 때마다 검토 시각이 갱신되면 언제 확인했는지가 사라진다.
 */
export function resolveReviewFields(
  write: Extract<ImageAttributionWrite, { action: "upsert" }>,
  existing: {
    reviewedBy: string | null;
    reviewedAt: Date | null;
    target: string | null;
  } | null,
  reviewer: string,
  now: Date,
): { reviewedBy: string | null; reviewedAt: Date | null } {
  if (!write.reviewed) return { reviewedBy: null, reviewedAt: null };

  const target = attributionReviewTarget(write.data);
  if (existing?.reviewedAt && existing.target === target) {
    return { reviewedBy: existing.reviewedBy, reviewedAt: existing.reviewedAt };
  }
  return { reviewedBy: reviewer, reviewedAt: now };
}
