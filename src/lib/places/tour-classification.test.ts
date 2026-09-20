import { describe, expect, it } from "vitest";

// 스크립트에서 직접 가져온다. 규칙을 두 곳에 적어 두면 갈라진다.
import {
  classifyContent,
  distanceFromServiceCenter,
  INTRO_FIELDS_BY_CONTENT_TYPE,
  SERVICE_AREA_CENTER,
  SERVICE_AREA_RADIUS_METERS,
} from "../../../scripts/tour-classification.mjs";
import {
  buildDescriptionReview,
  buildOperatingHoursReview,
  buildParkingReview,
  buildUsageGuide,
  buildPetPolicyReview,
  decodeApiText,
  phoneFromInquiry,
} from "../../../scripts/tour-pet-policy.mjs";

import { operatingHoursSchema } from "@/lib/places/operating-hours";
import {
  SERVICE_AREA_CENTER as SERVICE_AREA_CENTER_APP,
  SERVICE_AREA_RADIUS_METERS as SERVICE_AREA_RADIUS_METERS_APP,
} from "@/lib/places/service-area";
import { policyDetailsSchema, UNCERTAINTY_TARGETS } from "@/lib/places/policy-details";

/**
 * 값은 전부 **실제 KorPetTourService2 응답에서 확인한 것**이다.
 * 분류는 상호가 아니라 `contentTypeId` + `lclsSystm2`로 정한다.
 */

describe("분류코드 → Category", () => {
  it("음식점(39) + FD05(카페/찻집)는 CAFE다", () => {
    const result = classifyContent({
      contentTypeId: "39",
      lclsSystm1: "FD",
      lclsSystm2: "FD05",
      lclsSystm3: "FD050100",
    });
    expect(result.category).toBe("CAFE");
    expect(result.evidence.lclsSystm2Name).toBe("카페/ 찻집");
    expect(result.evidence.lclsSystm3Name).toBe("카페");
  });

  it.each(["FD01", "FD02"])("음식점(39) + %s는 RESTAURANT다", (lclsSystm2) => {
    expect(classifyContent({ contentTypeId: "39", lclsSystm1: "FD", lclsSystm2 }).category).toBe(
      "RESTAURANT",
    );
  });

  it("관광지(12)는 그대로 TRAVEL이다 — 기존 동작을 바꾸지 않는다", () => {
    const result = classifyContent({
      contentTypeId: "12",
      lclsSystm1: "NA",
      lclsSystm2: "NA04",
      lclsSystm3: "NA040600",
    });
    expect(result.category).toBe("TRAVEL");
    expect(result.rule).toBe("TYPE12_TRAVEL");
  });

  it("레포츠(28) + LS01(육상)은 TRAVEL이다 — 둘레길이 관광지의 둘레길과 갈라지지 않게 한다", () => {
    const result = classifyContent({
      contentTypeId: "28",
      lclsSystm1: "LS",
      lclsSystm2: "LS01",
      lclsSystm3: "LS011900",
    });
    expect(result.category).toBe("TRAVEL");
    expect(result.rule).toBe("TYPE28_LS01_TRAVEL");
    expect(result.evidence.lclsSystm2Name).toBe("육상레저스포츠");
  });

  it("쇼핑(38)은 SH02(쇼핑몰)만 TRAVEL이다 — 체인 매장이 몰린 SH04는 제외한다", () => {
    expect(classifyContent({ contentTypeId: "38", lclsSystm1: "SH", lclsSystm2: "SH02" }).rule).toBe(
      "TYPE38_SH02_TRAVEL",
    );
    // 대전 쇼핑 165건 중 164건이 SH04다. 매핑하면 체인 매장이 목록에 쏟아진다.
    for (const lclsSystm2 of ["SH01", "SH03", "SH04", "SH05", "SH06", "SH07", ""]) {
      expect(
        classifyContent({ contentTypeId: "38", lclsSystm1: "SH", lclsSystm2 }).category,
      ).toBeNull();
    }
  });

  it("문화시설(14)은 VE07(전시시설)만 TRAVEL이다", () => {
    expect(classifyContent({ contentTypeId: "14", lclsSystm1: "VE", lclsSystm2: "VE07" }).rule).toBe(
      "TYPE14_VE07_TRAVEL",
    );
    expect(
      classifyContent({ contentTypeId: "14", lclsSystm1: "VE", lclsSystm2: "VE01" }).category,
    ).toBeNull();
  });

  it("숙박(32)은 매핑하지 않는다 — Category에 대응 항목이 없다", () => {
    for (const lclsSystm2 of ["AC01", "AC03", "AC06"]) {
      expect(
        classifyContent({ contentTypeId: "32", lclsSystm1: "AC", lclsSystm2 }).category,
      ).toBeNull();
    }
  });

  it("레포츠 전체를 TRAVEL로 넘기지 않는다 — 수상·항공·복합은 본 적이 없다", () => {
    for (const lclsSystm2 of ["LS02", "LS03", "LS04", ""]) {
      const result = classifyContent({ contentTypeId: "28", lclsSystm1: "LS", lclsSystm2 });
      expect(result.category).toBeNull();
    }
  });

  it("39 전체를 CAFE로 넘기지 않는다 — 확인하지 않은 2단계 분류는 검토 대상이다", () => {
    for (const lclsSystm2 of ["FD03", "FD04", "FD99"]) {
      const result = classifyContent({ contentTypeId: "39", lclsSystm1: "FD", lclsSystm2 });
      expect(result.category).toBeNull();
      expect(result.reason).toContain(lclsSystm2);
    }
  });

  it("39인데 2단계 분류가 비어 있으면 검토 대상이다", () => {
    expect(classifyContent({ contentTypeId: "39", lclsSystm1: "FD", lclsSystm2: "" }).category).toBeNull();
  });

  it("39인데 1단계가 FD가 아니면 코드 충돌로 보고 검토 대상으로 남긴다", () => {
    const result = classifyContent({ contentTypeId: "39", lclsSystm1: "SH", lclsSystm2: "FD05" });
    expect(result.category).toBeNull();
    expect(result.reason).toContain("FD");
  });

  it.each(["15", "25", "32"])("매핑이 없는 관광타입 %s는 변환하지 않는다", (contentTypeId) => {
    expect(classifyContent({ contentTypeId, lclsSystm1: "SH", lclsSystm2: "SH04" }).category).toBeNull();
  });

  it("관광타입마다 소개 필드 이름이 다르다 — 전부 실제 응답에서 확인한 값이다", () => {
    expect(INTRO_FIELDS_BY_CONTENT_TYPE[12].hours).toBe("usetime");
    expect(INTRO_FIELDS_BY_CONTENT_TYPE[39].hours).toBe("opentimefood");
    expect(INTRO_FIELDS_BY_CONTENT_TYPE[39].inquiry).toBe("infocenterfood");
    expect(INTRO_FIELDS_BY_CONTENT_TYPE[28].hours).toBe("usetimeleports");
    expect(INTRO_FIELDS_BY_CONTENT_TYPE[38].hours).toBe("opentime");
    // 숙박에는 운영시간 필드가 없다. 입실·퇴실을 영업시간으로 쓰지 않는다.
    expect(INTRO_FIELDS_BY_CONTENT_TYPE[32].hours).toBeNull();
    expect(INTRO_FIELDS_BY_CONTENT_TYPE[32].checkIn).toBe("checkintime");
  });

  it("관광지 필드를 다른 타입에 쓰면 정보가 통째로 사라진다", () => {
    // 레포츠 실측값. 관광지 필드(usetime)로 읽으면 빈 값이라 "정보 없음"이 된다.
    const leports: Record<string, string> = {
      usetimeleports: "상시 개방",
      restdateleports: "연중무휴",
    };
    expect(leports[INTRO_FIELDS_BY_CONTENT_TYPE[12].hours]).toBeUndefined();
    expect(leports[INTRO_FIELDS_BY_CONTENT_TYPE[28].hours]).toBe("상시 개방");
  });
});

describe("반려견 동반 원문 → 제안 값", () => {
  const targetsOf = (result: { proposals: { target: string }[] }) =>
    result.proposals.map((proposal) => proposal.target);

  it("전구역 동반가능으로 실내 허용을 확정하지 않는다 — 범위만 보존한다", () => {
    // 야외 공원의 "전 구역"은 공원 전체를 함께 걷는다는 뜻이고, 건물 안 입장 확인이 아니다.
    const result = buildPetPolicyReview({ acmpyTypeCd: "전구역 동반가능" });
    expect(targetsOf(result)).not.toContain("PlaceCondition.indoor");
    expect(result.accompanyScope?.scope).toBe("ALL_AREAS");
    expect(result.unresolved.map((entry) => entry.target)).toContain("INDOOR");
  });

  it("일부구역 동반가능도 실내를 확정하지 않고, 어느 구역인지는 미확인으로 남는다", () => {
    const result = buildPetPolicyReview({ acmpyTypeCd: "일부구역 동반가능" });
    expect(targetsOf(result)).not.toContain("PlaceCondition.indoor");
    expect(result.accompanyScope?.scope).toBe("SOME_AREAS");
    const targets = result.unresolved.map((entry) => entry.target);
    expect(targets).toContain("INDOOR");
    expect(targets).toContain("SPACE");
  });

  it("동반이 불가하면 추천 후보에서 제외한다", () => {
    expect(buildPetPolicyReview({ acmpyTypeCd: "동반불가" }).blocked).not.toBeNull();
  });

  it("자유 텍스트의 '동반 불가'로는 장소 전체를 막지 않는다", () => {
    // 장태산 실측값. 일부 구역만 불가한 문장이 장소를 통째로 지우면 안 된다.
    const result = buildPetPolicyReview({
      acmpyTypeCd: "일부구역 동반가능",
      etcAcmpyInfo: "- 숙박시설, 출렁다리, 스카이 타워는 동반 불가",
    });
    expect(result.blocked).toBeNull();
    expect(result.unresolved.map((entry) => entry.target)).toContain("SPACE");
  });

  it('"자유이용"을 목줄 불필요·요금 무료로 읽지 않는다', () => {
    const result = buildPetPolicyReview({ acmpyTypeCd: "일부구역 동반가능", acmpyNeedMtr: "자유이용" });
    expect(targetsOf(result)).not.toContain("PlaceCondition.leash");
    expect(result.unresolved.map((entry) => entry.target)).toContain("LEASH");
  });

  it('"목줄 착용"만 leash=REQUIRED로 제안한다', () => {
    const result = buildPetPolicyReview({ acmpyTypeCd: "전구역 동반가능", acmpyNeedMtr: "목줄 착용" });
    expect(result.proposals).toContainEqual(
      expect.objectContaining({ target: "PlaceCondition.leash", value: "REQUIRED" }),
    );
  });

  it("이동장·유모차는 적용 범위를 알 수 없어 제안하지 않는다", () => {
    const result = buildPetPolicyReview({
      acmpyTypeCd: "일부구역 동반가능",
      acmpyNeedMtr: "반려동물 유모차 탑승,이동장(켄넬)사용,매너벨트 착용",
    });
    expect(targetsOf(result)).not.toContain("PlaceCondition.carrierStrollerPolicy");
    expect(result.unresolved.map((entry) => entry.target)).toContain("CARRIER_STROLLER");
  });

  it('"전 견종 동반 가능"을 체중 제한 없음으로 바꾸지 않는다', () => {
    const result = buildPetPolicyReview({
      acmpyTypeCd: "전구역 동반가능",
      acmpyPsblCpam: "전 견종 동반 가능",
    });
    expect(targetsOf(result)).not.toContain("PlaceCondition.maxDogSize");
    expect(result.unresolved.map((entry) => entry.target)).toContain("MAX_DOG_SIZE");
  });

  it("체고(cm) 기준과 예방접종 요구를 억지로 enum에 넣지 않는다", () => {
    // 대전반려동물공원 실측값.
    const result = buildPetPolicyReview({
      acmpyTypeCd: "전구역 동반가능",
      acmpyPsblCpam: "맹견 제외 필수 예방접종 및 동물등록 완료한 전 견종 동반 가능",
      etcAcmpyInfo: "체고 40cm 미만)은 중소형견 전용 놀이터, 체고 40cm 이상)은 대형견 전용 놀이터 이용",
    });
    const targets = result.unresolved.map((entry) => entry.target);
    expect(targets).toContain("BREED_RESTRICTIONS");
    expect(targets).toContain("VACCINATION_COMPLETION");
    expect(targetsOf(result)).not.toContain("PlaceCondition.maxDogSize");
  });

  it("야외 좌석만 가능하다는 문장으로 실내 허용도 금지도 만들지 않는다", () => {
    // 캠프다운 실측값. 문장은 야외 좌석만 말하고 실내는 말하지 않는다.
    const result = buildPetPolicyReview({
      acmpyTypeCd: "일부구역 동반가능",
      etcAcmpyInfo: "야외 좌석 동반 가능",
    });
    expect(targetsOf(result)).not.toContain("PlaceCondition.indoor");
    // 원문은 미확인 항목으로 남아 사람이 범위를 그대로 옮길 수 있어야 한다.
    const indoorEntries = result.unresolved.filter((entry) => entry.target === "INDOOR");
    expect(indoorEntries.length).toBeGreaterThan(0);
    expect(indoorEntries.some((entry) => entry.quote === "야외 좌석 동반 가능")).toBe(true);
  });

  it("분류값과 안내문이 어긋나면 충돌로 남긴다 — 한쪽을 고르지 않는다", () => {
    // 태조밥상 실측값.
    const result = buildPetPolicyReview({
      acmpyTypeCd: "일부구역 동반가능",
      etcAcmpyInfo: "실내‧외 전체 동반 가능, 다른 반려동물과 싸우지 않도로 반려인의 주의 필요",
    });
    expect(result.conflicts).toHaveLength(1);
  });

  it("미제공은 제한 없음이 아니다 — 빈 값도 미확인으로 남는다", () => {
    const result = buildPetPolicyReview({});
    expect(result.proposals).toHaveLength(0);
    const targets = result.unresolved.map((entry) => entry.target);
    expect(targets).toContain("INDOOR");
    expect(targets).toContain("MAX_DOG_SIZE");
  });

  it("미확인 항목의 target은 policyDetails.uncertainties가 받는 값이어야 한다", () => {
    const result = buildPetPolicyReview({
      acmpyTypeCd: "일부구역 동반가능",
      acmpyPsblCpam: "전 견종 동반 가능",
      acmpyNeedMtr: "자유이용,이동장(켄넬)사용,기타",
      relaPosesFclty: "반려동물 전용 별실",
      etcAcmpyInfo: "- 맹견의 경우, 입마개 착용 필수- 배변 봉투 지참 및 배변 처리 필수",
    });
    for (const entry of result.unresolved) {
      expect(UNCERTAINTY_TARGETS).toContain(entry.target);
    }
    // 그대로 policyDetails에 넣어도 스키마를 통과해야 관리자 화면으로 이어진다.
    const parsed = policyDetailsSchema.safeParse({
      version: 1,
      entry: { vaccinationCompletionPolicy: "UNKNOWN" },
      preparation: [],
      handling: [],
      spaceExceptions: [],
      behaviorRestrictions: [],
      admission: null,
      hygiene: [],
      uncertainties: result.unresolved.slice(0, 12).map((entry) => ({
        target: entry.target,
        reason: entry.reason.slice(0, 300),
        ...(entry.quote ? { quote: entry.quote.slice(0, 500) } : {}),
      })),
    });
    expect(parsed.success).toBe(true);
  });

  it("목줄 제안의 policyDetails 조각도 스키마를 통과한다", () => {
    const result = buildPetPolicyReview({ acmpyTypeCd: "전구역 동반가능", acmpyNeedMtr: "목줄 착용" });
    const group = result.proposals.find(
      (proposal): proposal is typeof proposal & { policyDetails: { value: unknown } } =>
        "policyDetails" in proposal,
    )?.policyDetails;
    const parsed = policyDetailsSchema.safeParse({
      version: 1,
      entry: { vaccinationCompletionPolicy: "UNKNOWN" },
      preparation: [group?.value],
      handling: [],
      spaceExceptions: [],
      behaviorRestrictions: [],
      admission: null,
      hygiene: [],
      uncertainties: [],
    });
    expect(parsed.success).toBe(true);
  });
});

describe("운영시간 원문 → 제안 값", () => {
  const food = INTRO_FIELDS_BY_CONTENT_TYPE[39];

  it("시간 구간 하나 + 연중무휴면 7일치를 제안한다", () => {
    const result = buildOperatingHoursReview(
      { opentimefood: "매일 10:00 - 19:00", restdatefood: "연중무휴" },
      food,
    );
    expect(operatingHoursSchema.safeParse(result.proposal?.hours).success).toBe(true);
    expect(result.proposal?.hours.sun).toEqual({ open: "10:00", close: "19:00" });
  });

  it("정기휴무 요일은 null로 둔다", () => {
    const result = buildOperatingHoursReview(
      { opentimefood: "09:00-19:00", restdatefood: "매주 화요일, 수요일 정기휴무" },
      food,
    );
    expect(result.proposal?.hours.tue).toBeNull();
    expect(result.proposal?.hours.wed).toBeNull();
    expect(result.proposal?.hours.mon).toEqual({ open: "09:00", close: "19:00" });
  });

  it("괄호 안 단서는 hoursNote 한 줄로만 남는다", () => {
    const result = buildOperatingHoursReview(
      { opentimefood: "11:00~21:00 (마지막 주문 20:30)", restdatefood: "연중무휴" },
      food,
    );
    expect(result.proposal?.hoursNote).toBe("마지막 주문 20:30");
  });

  it("요일별로 시간이 다르면 제안하지 않는다", () => {
    const result = buildOperatingHoursReview(
      {
        opentimefood: "- 월요일~토요일 10:30~20:30 (마지막 주문 20:00)- 일요일 10:35~19:30",
        restdatefood: "매주 월요일",
      },
      food,
    );
    expect(result.proposal).toBeNull();
  });

  it("휴무 표기를 요일로 읽지 못하면 제안하지 않는다 — 닫힌 날을 열렸다고 적지 않는다", () => {
    const result = buildOperatingHoursReview(
      { opentimefood: "10:00~19:00", restdatefood: "명절 당일 휴무" },
      food,
    );
    expect(result.proposal).toBeNull();
  });

  it("미제공은 휴무가 아니다", () => {
    const result = buildOperatingHoursReview({ opentimefood: "", restdatefood: "" }, food);
    expect(result.proposal).toBeNull();
    expect(result.reason).toContain("휴무가 아니다");
  });

  it("관광지의 자유 텍스트 운영시간은 제안하지 않는다", () => {
    // 장태산 실측값.
    const result = buildOperatingHoursReview(
      {
        usetime: "[숲속어드벤처/출렁다리]- 3월~6월/9월~10월 09:00~18:00- 7월~8월 09:00~19:00",
        restdate: "연중무휴",
      },
      INTRO_FIELDS_BY_CONTENT_TYPE[12],
    );
    expect(result.proposal).toBeNull();
  });
});

describe("문의처 → 전화번호", () => {
  it("번호 하나면 후보에 넣는다", () => {
    expect(phoneFromInquiry("063-288-4004")).toBe("063-288-4004");
    expect(phoneFromInquiry("0507-1480-9093")).toBe("0507-1480-9093");
  });

  it("안내 문구나 번호가 여럿이면 넣지 않는다", () => {
    expect(phoneFromInquiry("시설문의 042-270-7885\n숲속의집 안내센터 042-583-0094")).toBeNull();
    expect(phoneFromInquiry("")).toBeNull();
  });
});

describe("응답 원문의 HTML", () => {
  it("<br>을 줄바꿈으로 바꾸고 태그를 지운다", () => {
    // 상소동 산림욕장·만인산 실측값. 그대로 두면 화면에 `<br>`이 글자로 나온다.
    expect(decodeApiText("가능<br>\n요금 (무료)")).toBe("가능\n요금 (무료)");
    expect(decodeApiText("<p>안내</p>")).toBe("안내");
    expect(decodeApiText("A &amp; B&nbsp;C")).toBe("A & B C");
  });

  it("문자열이 아니면 빈 문자열이다", () => {
    expect(decodeApiText(undefined)).toBe("");
    expect(decodeApiText(null)).toBe("");
  });
});

describe("숙박(32) — 입실·퇴실을 운영시간으로 쓰지 않는다", () => {
  const lodging = INTRO_FIELDS_BY_CONTENT_TYPE[32];

  it("운영시간 필드가 없으면 제안하지 않는다", () => {
    const result = buildOperatingHoursReview({ checkintime: "15:00", checkouttime: "11:00" }, lodging);
    expect(result.proposal).toBeNull();
    expect(result.reason).toContain("입실·퇴실");
  });

  it("입실·퇴실은 라벨을 붙여 안내로만 남는다", () => {
    const guide = buildUsageGuide(
      { checkintime: "15:00", checkouttime: "11:00", parkinglodging: "가능" },
      lodging,
      null,
    );
    expect(guide.guide).toContain("[입실/퇴실] 15:00 / 11:00");
    expect(guide.guide).toContain("[주차] 가능");
  });
});

describe("주차 원문 → 제안 값", () => {
  const fields = INTRO_FIELDS_BY_CONTENT_TYPE[12];

  it("가능/불가능을 맨 앞 낱말로 읽는다", () => {
    expect(buildParkingReview({ parking: "가능" }, fields).proposal?.parking).toBe("AVAILABLE");
    // "불가능"은 "가능"을 포함한다. 부정을 먼저 보지 않으면 뒤집힌다.
    expect(buildParkingReview({ parking: "불가능" }, fields).proposal?.parking).toBe("UNAVAILABLE");
  });

  it("HTML이 섞인 실측값도 읽고 나머지는 메모 원문으로 남긴다", () => {
    const result = buildParkingReview({ parking: "가능<br>\n요금 (무료)" }, fields);
    expect(result.proposal?.parking).toBe("AVAILABLE");
    expect(result.proposal?.parkingNoteSource).toBe("요금 (무료)");
    // 화면에 그대로 나가는 칸이므로 한국어 원문을 자동으로 넣지 않는다.
    expect(result.proposal?.parkingNote).toBeNull();
  });

  it("미제공은 주차 불가가 아니다", () => {
    const result = buildParkingReview({ parking: "" }, fields);
    expect(result.proposal).toBeNull();
    expect(result.reason).toContain("주차 불가가 아니다");
  });

  it("읽지 못하는 문구는 제안하지 않는다", () => {
    expect(buildParkingReview({ parking: "예약제 운영" }, fields).proposal).toBeNull();
  });
});

describe("장소 소개 원문", () => {
  it("원문은 검토 자료로만 싣고 저장 대상으로 만들지 않는다", () => {
    const result = buildDescriptionReview({ overview: "메타세쿼이아 숲이 있는 휴양림이다." });
    expect(result.proposal?.target).toBe("Place.descriptionKr");
    expect(result.raw).toContain("메타세쿼이아");
    // 제안에는 본문이 들어가지 않는다 — 등록기가 집어 갈 값이 아니라는 뜻이다.
    expect(Object.values(result.proposal ?? {})).not.toContain(result.raw);
  });

  it("미제공이면 제안이 없다", () => {
    expect(buildDescriptionReview({ overview: "" }).proposal).toBeNull();
  });
});

describe("관광지 운영시간 — 구역·계절별 시간을 합치지 않는다", () => {
  const fields = INTRO_FIELDS_BY_CONTENT_TYPE[12];

  it("하절기/동절기로 나뉜 값은 제안하지 않는다", () => {
    // 뿌리공원 실측값.
    const result = buildOperatingHoursReview(
      {
        usetime: "[하절기(3월~10월)]<br>\n05:00~23:00<br>\n[동절기(11월~2월)]<br>\n06:00~22:00",
        restdate: "연중무휴",
      },
      fields,
    );
    expect(result.proposal).toBeNull();
  });

  it("시설별로 나뉜 값도 제안하지 않는다 — 출렁다리 시간은 휴양림 시간이 아니다", () => {
    // 장태산 실측값.
    const result = buildOperatingHoursReview(
      {
        usetime:
          "[숲속어드벤처/출렁다리]- 3월~6월/9월~10월 09:00~18:00- 7월~8월 09:00~19:00- 11월~2월 09:00~17:00[숙박시설]- 입실 15:00- 퇴실 11:00",
        restdate: "연중무휴",
      },
      fields,
    );
    expect(result.proposal).toBeNull();
  });

  it("장소 전체에 하나뿐인 시간은 제안한다", () => {
    // 우암사적공원 실측값. <br> 뒤 안내 문구가 붙어 있어도 구간은 하나다.
    const result = buildOperatingHoursReview(
      { usetime: "05:00~21:00<br>\n※ 자세한 사항은 전화문의 요망", restdate: "연중무휴" },
      fields,
    );
    expect(result.proposal?.hours.mon).toEqual({ open: "05:00", close: "21:00" });
  });

  it("요일 범위로 적힌 휴무는 가운데 요일까지 닫는다", () => {
    // 하림펫푸드 실측값이 "매주 화요일~수요일·일요일"이다. 양끝만 읽으면 범위가 넓을 때
    // 가운데 요일이 열린 것으로 저장된다.
    const spread = buildOperatingHoursReview(
      { usetime: "10:00~13:00", restdate: "매주 월요일~금요일" },
      fields,
    );
    for (const day of ["mon", "tue", "wed", "thu", "fri"] as const) {
      expect(spread.proposal?.hours[day]).toBeNull();
    }
    expect(spread.proposal?.hours.sat).toEqual({ open: "10:00", close: "13:00" });

    // 주를 넘어가는 범위도 같은 규칙을 따른다.
    const wrapped = buildOperatingHoursReview(
      { usetime: "10:00~13:00", restdate: "매주 토요일~월요일" },
      fields,
    );
    expect(wrapped.proposal?.hours.sat).toBeNull();
    expect(wrapped.proposal?.hours.sun).toBeNull();
    expect(wrapped.proposal?.hours.mon).toBeNull();
    expect(wrapped.proposal?.hours.tue).not.toBeNull();
  });

  it("계절 운영기간이 붙어 있으면 연중 시간표로 만들지 않는다", () => {
    // 옥천군 반려동물 놀이터 실측값. 12~2월은 닫는데 연중으로 저장하면 겨울에 열린다고 말한다.
    const result = buildOperatingHoursReview(
      {
        usetime: "운영기간: 3월~11월<br>\n운영시간: 09:00~17:00 (입장 9:30, 퇴장 16:30)",
        restdate: "매주 월요일(장마, 우천, 폭염경보 시 임시휴장)",
      },
      fields,
    );
    expect(result.proposal).toBeNull();
    expect(result.reason).toContain("기간");
  });

  it('"상시 개방"은 현재 형식으로 표현할 수 없어 제안하지 않는다', () => {
    const result = buildOperatingHoursReview({ usetime: "상시 개방", restdate: "연중무휴" }, fields);
    expect(result.proposal).toBeNull();
  });
});

describe("서비스 범위 상수", () => {
  it("수집 스크립트와 서비스 코드가 같은 중심·반경을 쓴다", () => {
    // 수집기는 순수 node라 TS 모듈을 가져올 수 없어 값을 옮겨 적는다. 갈라지면 여기서 잡는다.
    expect(SERVICE_AREA_CENTER).toEqual(SERVICE_AREA_CENTER_APP);
    expect(SERVICE_AREA_RADIUS_METERS).toBe(SERVICE_AREA_RADIUS_METERS_APP);
  });

  it("좌표를 읽을 수 없으면 거리를 0으로 만들지 않는다", () => {
    expect(distanceFromServiceCenter("", "")).toBeNull();
    expect(distanceFromServiceCenter(undefined, 127)).toBeNull();
  });

  it("대전시청 좌표의 거리는 0에 가깝다", () => {
    expect(distanceFromServiceCenter(36.3504, 127.3845)).toBeLessThan(1);
  });
});
