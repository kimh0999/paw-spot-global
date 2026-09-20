import { safeHttpUrl } from "@/lib/validation/url";

/**
 * 대표 이미지의 출처 판정 (결정 D-22).
 *
 * 한 곳에서만 정한다. 목록 카드·상세·즐겨찾기가 각자 판단하면 한쪽에서만 이미지가
 * 새어 나간다. 공개 DTO(`toPlaceListItem`·`getPlaceById`)가 이 함수를 통과시킨 결과만
 * 화면으로 내보낸다.
 *
 * 공공누리(KOGL) 네 유형은 **모두 출처 표시를 요구한다**
 * (https://www.kogl.or.kr/info/licenseType1.do). 표시할 근거가 없으면 이미지를 내보내지
 * 않는 쪽을 택한다 — 조건을 지키지 못한 채 노출하는 것보다 사진 자리가 없는 편이 낫다.
 */

/**
 * 한국관광공사가 이미지를 서빙하는 호스트.
 *
 * **출처 문구를 만들어 내는 데 쓰지 않는다.** 출처 문구는 DB의 기록에서만 나온다.
 * 이 목록은 "이 이미지는 출처 기록이 있어야 한다"를 판정하는 데만 쓴다 —
 * 관리자가 기록 없이 붙여 넣은 관광공사 이미지가 조용히 공개되는 것을 막는 장치다.
 * `tourApiId`를 보지 않는 이유는, 출처 조건을 정하는 것이 장소가 아니라 **이미지**이기
 * 때문이다. TourAPI로 들어온 장소에 관리자가 직접 찍은 사진을 넣을 수도 있다.
 */
const KTO_IMAGE_HOSTS = new Set(["tong.visitkorea.or.kr"]);

export type ImageLicenseTypeValue =
  | "KOGL_TYPE1"
  | "KOGL_TYPE2"
  | "KOGL_TYPE3"
  | "KOGL_TYPE4"
  | "UNKNOWN";

/** DB에서 읽은 출처 기록. 행이 없으면 null이다. */
export interface ImageAttributionRecord {
  imageUrl: string;
  provider: string;
  copyrightHolder: string | null;
  workTitle: string | null;
  createdYear: number | null;
  sourceUrl: string;
  licenseType: string;
  licenseUrl: string | null;
  reviewedAt: Date | null;
}

/** 화면에 내보내는 출처. 확인된 값만 담는다 — 비어 있는 항목을 지어내지 않는다. */
export interface ImageAttributionDisplay {
  provider: string;
  copyrightHolder: string | null;
  workTitle: string | null;
  createdYear: number | null;
  /** http/https 검사를 통과한 주소만 온다. */
  sourceUrl: string;
  licenseType: ImageLicenseTypeValue;
  licenseUrl: string | null;
}

export type ImageAttributionResolution =
  /** 출처 조건이 없는 이미지. 지금까지처럼 그대로 보여준다. */
  | { state: "not_required" }
  /** 출처 표시가 필요한데 쓸 수 있는 기록이 없다. **이미지를 내보내지 않는다.** */
  | { state: "blocked"; reason: ImageAttributionBlockReason }
  | { state: "ready"; display: ImageAttributionDisplay };

export type ImageAttributionBlockReason =
  /** 관광공사 호스트 이미지인데 출처 기록 자체가 없다. */
  | "missingRecord"
  /** 기록은 있으나 지금 이미지가 아니다 — 관리자가 주소를 바꿨다. */
  | "imageChanged"
  /** 사람 검토 전이다. */
  | "unreviewed"
  /** 출처 링크가 http/https가 아니다. */
  | "invalidSourceUrl"
  /** 이용 조건이 요구하는 표시 항목이 아직 비어 있다. 체크만으로 통과시키지 않는다. */
  | "incompleteAttribution";

/** 공공누리 네 유형. 모두 출처 표시를 요구하고 요구 항목도 같다. */
function isKoglLicense(value: ImageLicenseTypeValue): boolean {
  return value !== "UNKNOWN";
}

/**
 * 이 이미지를 공개하기 전에 아직 채워야 하는 출처 항목 (결정 D-22).
 *
 * 공공누리 출처 표시는 **기관명·작성연도·저작물명·작성자·기관 홈페이지 주소**를 요구한다
 * (https://www.kogl.or.kr/info/licenseType1.do). 유형이 `Type1`이라는 것과 검토
 * 체크박스만으로는 이 항목들이 채워지지 않는다. 비어 있으면 공개하지 않는다 —
 * 표시할 수 없는 조건을 "표시했다"고 취급하지 않기 위해서다.
 *
 * **한국관광공사 호스트 이미지는 이용 조건을 `UNKNOWN`으로 둘 수 없다.** 그렇게 두면
 * 공공누리 요구 항목을 건너뛰고 통과하는 길이 생긴다 — 이미지를 수동 등록으로
 * 분류해 검토를 우회하는 것과 같다.
 *
 * 값을 채우는 것은 사람의 일이다. 이 함수는 무엇이 비었는지만 말하고 만들어 넣지 않는다.
 */
export function missingAttributionFields(
  thumbnailUrl: string | null | undefined,
  record: Pick<
    ImageAttributionRecord,
    "provider" | "copyrightHolder" | "workTitle" | "createdYear" | "sourceUrl" | "licenseType"
  >,
): ImageAttributionField[] {
  const missing: ImageAttributionField[] = [];
  if (!record.provider?.trim()) missing.push("provider");
  if (!safeHttpUrl(record.sourceUrl)) missing.push("sourceUrl");

  const licenseType = toLicenseType(record.licenseType);
  if (!isKoglLicense(licenseType)) {
    // 관광공사가 내려준 이미지는 공공누리로 개방된 것이다. 유형을 확인해 적어야 한다.
    if (isKtoImageUrl(thumbnailUrl)) missing.push("licenseType");
    return missing;
  }

  if (!record.copyrightHolder?.trim()) missing.push("copyrightHolder");
  if (!record.workTitle?.trim()) missing.push("workTitle");
  // 작성연도다. API의 콘텐츠 등록일이나 수집일로 대신 채우지 않는다.
  if (record.createdYear == null) missing.push("createdYear");
  return missing;
}

export type ImageAttributionField =
  | "provider"
  | "sourceUrl"
  | "licenseType"
  | "copyrightHolder"
  | "workTitle"
  | "createdYear";

function toLicenseType(value: string): ImageLicenseTypeValue {
  switch (value) {
    case "KOGL_TYPE1":
    case "KOGL_TYPE2":
    case "KOGL_TYPE3":
    case "KOGL_TYPE4":
      return value;
    default:
      return "UNKNOWN";
  }
}

/** 이 이미지가 한국관광공사가 서빙하는 주소인지. 판정 실패는 "아니다"로 본다. */
export function isKtoImageUrl(imageUrl: string | null | undefined): boolean {
  const safe = safeHttpUrl(imageUrl);
  if (!safe) return false;
  try {
    return KTO_IMAGE_HOSTS.has(new URL(safe).hostname.toLowerCase());
  } catch {
    return false;
  }
}

/**
 * 지금 이 이미지에 붙는 출처를 정한다.
 *
 * 기록이 **현재 이미지 주소와 일치**하고 **사람 검토를 거쳤을 때만** 표시한다.
 * 관리자가 이미지를 교체하면 이전 기록의 검토 상태가 새 이미지로 넘어가지 않는다.
 */
export function resolveImageAttribution(
  thumbnailUrl: string | null | undefined,
  record: ImageAttributionRecord | null | undefined,
): ImageAttributionResolution {
  const image = safeHttpUrl(thumbnailUrl);
  const needsAttribution = record != null || isKtoImageUrl(image);
  if (!needsAttribution) return { state: "not_required" };

  if (!record) return { state: "blocked", reason: "missingRecord" };
  if (!image || safeHttpUrl(record.imageUrl) !== image) {
    return { state: "blocked", reason: "imageChanged" };
  }
  if (record.reviewedAt == null) return { state: "blocked", reason: "unreviewed" };

  const sourceUrl = safeHttpUrl(record.sourceUrl);
  if (!sourceUrl) return { state: "blocked", reason: "invalidSourceUrl" };

  // 검토 체크는 "사람이 봤다"는 표시일 뿐이다. 표시할 항목이 비어 있으면 공개하지 않는다.
  if (missingAttributionFields(image, record).length > 0) {
    return { state: "blocked", reason: "incompleteAttribution" };
  }

  return {
    state: "ready",
    display: {
      provider: record.provider,
      copyrightHolder: record.copyrightHolder,
      workTitle: record.workTitle,
      createdYear: record.createdYear,
      sourceUrl,
      licenseType: toLicenseType(record.licenseType),
      licenseUrl: safeHttpUrl(record.licenseUrl),
    },
  };
}

/**
 * 판정 결과를 한 값으로 눌러 담은 것. 관리자 화면·공개 전환 검사가 같은 값을 읽는다.
 * `not_required`와 `ready`만 공개 가능이고 나머지는 보완이 필요한 상태다.
 */
export type ImageAttributionStatus =
  | "not_required"
  | "ready"
  | ImageAttributionBlockReason;

export function imageAttributionStatus(
  thumbnailUrl: string | null | undefined,
  record: ImageAttributionRecord | null | undefined,
): ImageAttributionStatus {
  const resolution = resolveImageAttribution(thumbnailUrl, record);
  return resolution.state === "blocked" ? resolution.reason : resolution.state;
}

/** 이 상태로 공개하면 출처 없는 이미지가 노출되거나 사진이 사라진다. */
export function blocksPublicImage(status: ImageAttributionStatus): boolean {
  return status !== "not_required" && status !== "ready";
}

/**
 * 공개 화면에 내보낼 이미지와 출처.
 *
 * `blocked`면 **주소 자체를 null로 내린다.** 호출부가 `hasUsablePhoto`로 자리를 만들지
 * 말지 판단하므로, 여기서 null을 주면 사진 자리가 생기지 않는다.
 */
export function publicImageFields(
  thumbnailUrl: string | null | undefined,
  record: ImageAttributionRecord | null | undefined,
): { thumbnailUrl: string | null; imageAttribution: ImageAttributionDisplay | null } {
  const resolution = resolveImageAttribution(thumbnailUrl, record);
  if (resolution.state === "blocked") {
    return { thumbnailUrl: null, imageAttribution: null };
  }
  return {
    thumbnailUrl: thumbnailUrl ?? null,
    imageAttribution: resolution.state === "ready" ? resolution.display : null,
  };
}
