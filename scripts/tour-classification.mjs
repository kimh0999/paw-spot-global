/**
 * TourAPI 분류코드 → 우리 `Category` 매핑과, 관광타입별 소개 필드 이름.
 *
 * 수집(`collect-tour-area.cjs`)·변환(`prepare-tour-import.cjs`)·검토(`review-tour-import.cjs`)가
 * 같은 규칙을 봐야 하므로 한 곳에 둔다. ESM인 이유는 vitest가 그대로 가져가기 때문이고,
 * `.cjs` 스크립트는 `await import()`로 읽는다(`tour-import-meta.mjs`와 같은 방식).
 *
 * **여기 적힌 코드와 명칭은 전부 실제 응답에서 확인한 값이다.** 첨부 엑셀이나 옛 `cat3`가
 * 아니라 `lclsSystmCode2` 호출 결과이며, 확인 시각은 아래 `CODE_TABLE_SOURCE`에 적는다.
 * 확인하지 못한 코드는 매핑하지 않는다 — "분류 검토 대상"으로 남기고 변환하지 않는다.
 */

/** 이 파일의 코드·명칭을 어디서 언제 확인했는지. 근거 없는 매핑을 막기 위한 기록이다. */
export const CODE_TABLE_SOURCE = {
  service: "KorPetTourService2",
  endpoint: "lclsSystmCode2",
  verifiedAt: "2026-09-20",
  note: "국문 코드표 기준. 실제 요청·응답으로 확인했다.",
};

/**
 * 실제 `lclsSystmCode2` 응답에서 확인한 명칭.
 * 매핑 규칙이 기대는 코드만 적는다. 전체 코드표는 `data/tour-api/codes.json` 캐시에 있다.
 */
export const VERIFIED_LCLS_NAMES = {
  SH: "쇼핑",
  SH01: "백화점",
  SH02: "쇼핑몰",
  SH03: "대형마트",
  SH04: "면세점",
  SH05: "전문매장/상가",
  SH06: "시장",
  SH07: "기타쇼핑시설",
  VE07: "전시시설",
  LS: "레포츠",
  LS01: "육상레저스포츠",
  LS02: "수상레저스포츠",
  LS03: "항공레저스포츠",
  LS04: "복합레저스포츠",
  FD: "음식",
  FD01: "한식",
  FD02: "외국식",
  FD03: "간이음식",
  FD04: "주점",
  FD05: "카페/ 찻집",
  FD010100: "관광식당",
  FD010200: "모범음식점",
  FD050100: "카페",
  FD050200: "찻집",
  FD050300: "기타음료점",
};

/** 관광타입 명칭. `contentTypeId`는 국문 코드표 기준이다(음식점 = 39). */
export const CONTENT_TYPE_NAMES = {
  12: "관광지",
  14: "문화시설",
  15: "축제공연행사",
  25: "여행코스",
  28: "레포츠",
  32: "숙박",
  38: "쇼핑",
  39: "음식점",
};

/**
 * 관광타입 39(음식점)의 2단계 분류 → 우리 `Category`.
 *
 * **상호에 "카페"가 들어간다는 이유로 정하지 않는다.** 판단은 `lclsSystm2` 하나로 한다.
 * 여기 없는 코드(FD03 간이음식·FD04 주점 등)는 실제 응답에서 아직 본 적이 없어
 * 매핑하지 않는다. 만나면 분류 검토 대상으로 남는다.
 */
const FOOD_CATEGORY_BY_LCLS2 = {
  FD05: { category: "CAFE", rule: "TYPE39_FD05_CAFE" },
  FD01: { category: "RESTAURANT", rule: "TYPE39_FD01_RESTAURANT" },
  FD02: { category: "RESTAURANT", rule: "TYPE39_FD02_RESTAURANT" },
};

const text = (value) => (typeof value === "string" ? value.trim() : "");

/**
 * 분류 판정. 근거를 함께 돌려준다.
 *
 * `category`가 null이면 변환하지 않고 **분류 검토 대상**으로 센다. 오류가 아니다 —
 * 코드와 설명이 어긋나는 곳을 사람이 보게 남기는 것이 목적이다.
 */
export function classifyContent(source) {
  const contentTypeId = text(source?.contentTypeId);
  const lclsSystm1 = text(source?.lclsSystm1);
  const lclsSystm2 = text(source?.lclsSystm2);
  const lclsSystm3 = text(source?.lclsSystm3);

  const evidence = {
    contentTypeId,
    contentTypeName: CONTENT_TYPE_NAMES[contentTypeId] ?? null,
    lclsSystm1,
    lclsSystm1Name: VERIFIED_LCLS_NAMES[lclsSystm1] ?? null,
    lclsSystm2,
    lclsSystm2Name: VERIFIED_LCLS_NAMES[lclsSystm2] ?? null,
    lclsSystm3,
    lclsSystm3Name: VERIFIED_LCLS_NAMES[lclsSystm3] ?? null,
    codeTableSource: CODE_TABLE_SOURCE,
  };

  const undecided = (reason) => ({ category: null, rule: null, reason, evidence });

  if (contentTypeId === "38") {
    // **쇼핑은 `SH02`(쇼핑몰)만이다.** 대전 쇼핑 165건 중 164건이 `SH04`인데, 그 164건은
    // 올리브영·나이키 같은 체인 매장이고 동반 정보가 전부 같은 본사 일괄값이다
    // (`"전구역 동반가능"` + 나머지 미제공). 지점별 확인으로 볼 수 없어 매핑하지 않는다.
    if (lclsSystm2 === "SH02") {
      return {
        category: "TRAVEL",
        rule: "TYPE38_SH02_TRAVEL",
        reason: "관광타입 38(쇼핑) + SH02(쇼핑몰) → TRAVEL",
        evidence,
      };
    }
    return undecided(
      `쇼핑 2단계 분류 ${lclsSystm2 || "미제공"}(${evidence.lclsSystm2Name ?? "명칭 미확인"})는 매핑하지 않습니다. 쇼핑몰(SH02)만 확정했습니다.`,
    );
  }

  if (contentTypeId === "14") {
    // 전시시설(VE07)만 확인했다. 공연장·도서관 등 다른 문화시설은 응답에서 본 적이 없다.
    if (lclsSystm2 === "VE07") {
      return {
        category: "TRAVEL",
        rule: "TYPE14_VE07_TRAVEL",
        reason: "관광타입 14(문화시설) + VE07(전시시설) → TRAVEL",
        evidence,
      };
    }
    return undecided(
      `문화시설 2단계 분류 ${lclsSystm2 || "미제공"}(${evidence.lclsSystm2Name ?? "명칭 미확인"})는 매핑이 확정되지 않았습니다. 전시시설(VE07)만 확정했습니다.`,
    );
  }

  if (contentTypeId === "28") {
    // 레포츠 중 **육상(LS01)만** TRAVEL이다. 실제로 확인한 5건이 전부 둘레길·도보길이고,
    // 이미 `TRAVEL`로 등록한 `보문산 행복 숲 둘레길`(관광타입 12)과 같은 종류다.
    // 수상·항공·복합(LS02~LS04)은 응답에서 본 적이 없어 매핑하지 않는다.
    if (lclsSystm2 === "LS01") {
      return {
        category: "TRAVEL",
        rule: "TYPE28_LS01_TRAVEL",
        reason: "관광타입 28(레포츠) + LS01(육상레저스포츠) → TRAVEL",
        evidence,
      };
    }
    return undecided(
      `레포츠 2단계 분류 ${lclsSystm2 || "미제공"}(${evidence.lclsSystm2Name ?? "명칭 미확인"})는 매핑이 확정되지 않았습니다. 육상(LS01)만 확정했습니다.`,
    );
  }

  if (contentTypeId === "12") {
    // 기존 동작을 유지한다. 관광지는 2단계 분류와 무관하게 TRAVEL이다.
    return {
      category: "TRAVEL",
      rule: "TYPE12_TRAVEL",
      reason: "관광타입 12(관광지) → TRAVEL",
      evidence,
    };
  }

  if (contentTypeId !== "39") {
    return undecided(
      `관광타입 ${contentTypeId || "미제공"}(${evidence.contentTypeName ?? "명칭 미확인"})은(는) 분류 기준이 정해지지 않았습니다.`,
    );
  }

  if (!lclsSystm2) {
    return undecided("관광타입 39이지만 2단계 분류코드(lclsSystm2)가 비어 있습니다.");
  }
  if (lclsSystm1 && lclsSystm1 !== "FD") {
    // 코드와 설명이 충돌하는 경우다. 조용히 한쪽을 고르지 않는다.
    return undecided(
      `관광타입 39(음식점)인데 1단계 분류가 FD(음식)가 아닙니다 (lclsSystm1=${lclsSystm1}).`,
    );
  }

  const matched = FOOD_CATEGORY_BY_LCLS2[lclsSystm2];
  if (!matched) {
    return undecided(
      `2단계 분류 ${lclsSystm2}(${evidence.lclsSystm2Name ?? "명칭 미확인"})는 매핑이 확정되지 않았습니다.`,
    );
  }
  return {
    category: matched.category,
    rule: matched.rule,
    reason: `관광타입 39(음식점) + ${lclsSystm2}(${evidence.lclsSystm2Name}) → ${matched.category}`,
    evidence,
  };
}

/**
 * `detailIntro2`의 운영 정보 필드는 **관광타입마다 이름이 다르다.**
 * 음식점(39)에서 `usetime`을 읽으면 언제나 비어 있어 "정보 없음"으로 잘못 적힌다.
 * 실제 응답에서 확인한 이름만 넣는다.
 */
export const INTRO_FIELDS_BY_CONTENT_TYPE = {
  12: {
    hours: "usetime",
    restDate: "restdate",
    parking: "parking",
    inquiry: "infocenter",
  },
  39: {
    hours: "opentimefood",
    restDate: "restdatefood",
    parking: "parkingfood",
    inquiry: "infocenterfood",
  },
  // 아래 셋은 분류가 아직 정해지지 않은 타입이지만(§분류 검토), 이름은 실제 응답에서
  // 확인해 두었다. 관광지 필드로 읽으면 전부 빈 값이라 "정보 없음"으로 잘못 적힌다.
  28: {
    hours: "usetimeleports",
    restDate: "restdateleports",
    parking: "parkingleports",
    inquiry: "infocenterleports",
  },
  38: {
    hours: "opentime",
    restDate: "restdateshopping",
    parking: "parkingshopping",
    inquiry: "infocentershopping",
  },
  /**
   * 숙박(32)에는 **운영시간 필드가 없다.** 입실·퇴실 시각이 있을 뿐이고 둘은 다른 개념이다.
   * `hours`를 비워 두어 입실 15:00이 영업 시작으로 저장되는 일을 막는다 —
   * 장태산에서 이미 같은 함정을 봤다(숙박시설 입·퇴실 시간).
   */
  32: {
    hours: null,
    restDate: null,
    parking: "parkinglodging",
    inquiry: "infocenterlodging",
    checkIn: "checkintime",
    checkOut: "checkouttime",
  },
};

/** 검토 자료에 원문 그대로 실어 둘 음식점 소개 필드. 자동 변환하지 않는다. */
export const FOOD_INTRO_EXTRA_FIELDS = [
  "firstmenu",
  "treatmenu",
  "packing",
  "reservationfood",
  "seat",
  "kidsfacility",
  "smoking",
  "scalefood",
  "chkcreditcardfood",
  "discountinfofood",
  "opendatefood",
  "lcnsno",
];

/**
 * 반려견 동반 원문 필드. `detailPetTour2` 응답에서 확인한 이름이다.
 * 값이 빈 문자열이면 "제한 없음"이 아니라 **"미제공"**이다.
 */
export const PET_TOUR_FIELDS = [
  "acmpyTypeCd",
  "acmpyPsblCpam",
  "acmpyNeedMtr",
  "relaAcdntRiskMtr",
  "relaPosesFclty",
  "relaFrnshPrdlst",
  "relaPurcPrdlst",
  "relaRntlPrdlst",
  "etcAcmpyInfo",
];

/**
 * 서비스 범위. **`src/lib/places/service-area.ts`와 같은 값이어야 한다** —
 * 수집 스크립트는 순수 node라 그 TypeScript 모듈을 가져올 수 없어 옮겨 적는다.
 * 두 곳이 갈라지지 않도록 `tour-classification.test.ts`가 값을 맞춰 본다.
 *
 * 행정구역 경계와 반경은 다른 기준이다. 대전(`lDongRegnCd=30`) 안에도 반경 밖이 있을 수 있고,
 * 세종·충남·충북에도 반경 안이 있다. **행정구역 포함 여부를 반경 판정으로 대신하지 않는다.**
 */
export const SERVICE_AREA_CENTER = { lat: 36.3504, lng: 127.3845 };
export const SERVICE_AREA_RADIUS_METERS = 50_000;

const EARTH_RADIUS_METERS = 6_371_000;
const toRadians = (degrees) => (degrees * Math.PI) / 180;

/** 대전시청에서의 거리(m). 좌표를 읽을 수 없으면 null이다 — 0으로 만들지 않는다. */
export function distanceFromServiceCenter(lat, lng) {
  // **빈 문자열을 0으로 읽지 않는다.** API는 좌표가 없으면 `""`를 주고, `Number("")`는 0이라
  // 그대로 두면 아프리카 앞바다 좌표가 되어 "반경 밖"으로 조용히 분류된다.
  const parse = (value) => {
    if (value == null) return NaN;
    const text = String(value).trim();
    return text === "" ? NaN : Number(text);
  };
  const latitude = parse(lat);
  const longitude = parse(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const dLat = toRadians(latitude - SERVICE_AREA_CENTER.lat);
  const dLng = toRadians(longitude - SERVICE_AREA_CENTER.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(SERVICE_AREA_CENTER.lat)) *
      Math.cos(toRadians(latitude)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(a));
}
