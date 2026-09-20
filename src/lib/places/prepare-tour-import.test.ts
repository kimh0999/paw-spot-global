import { describe, expect, it } from "vitest";

// 스크립트에서 직접 가져온다. 규칙을 테스트에 옮겨 적으면 두 곳이 갈라진다.
import { buildReviewSheet, convertSnapshot } from "../../../scripts/prepare-tour-import.cjs";
import { isHttpUrl } from "../../../scripts/import-places.mjs";
import * as classification from "../../../scripts/tour-classification.mjs";
import * as petPolicy from "../../../scripts/tour-pet-policy.mjs";

/**
 * 원본 스냅샷 → 등록 후보 변환.
 *
 * 여기서 잡으려는 것은 **후보에 실려야 할 값이 조용히 빠지거나, 검토자에게 사실이 아닌
 * 안내가 나가는 것**이다. 2026-09-20에 `else if`가 엉뚱한 `if`에 붙어 전화번호가
 * 저장됐는데도 "제외했습니다"라고 적힌 일이 있었다.
 */

const lib = { ...classification, ...petPolicy };

type ResponseItem = Record<string, unknown>;

function response(items: ResponseItem[]) {
  return {
    fetchedAt: "2026-09-20T00:00:00.000Z",
    data: {
      response: {
        header: { resultCode: "0000", resultMsg: "OK" },
        body: { items: { item: items }, totalCount: items.length },
      },
    },
  };
}

function snapshotFor({
  contentTypeId = "12",
  common = {},
  intro = {},
  pet = {},
}: {
  contentTypeId?: string;
  common?: ResponseItem;
  intro?: ResponseItem;
  pet?: ResponseItem;
} = {}) {
  const contentId = "999001";
  const base = { contentid: contentId, contenttypeid: contentTypeId };
  return {
    formatVersion: 1,
    source: { provider: "한국관광공사", service: "KorPetTourService2" },
    contentId,
    contentTypeId,
    fetchedAt: "2026-09-20T00:00:00.000Z",
    reviewStatus: "UNREVIEWED",
    responses: {
      detailCommon2: response([
        {
          ...base,
          title: "테스트 공원",
          addr1: "대전광역시 서구 테스트로 1",
          mapx: "127.3845",
          mapy: "36.3504",
          tel: "",
          lclsSystm1: "NA",
          lclsSystm2: "NA04",
          lclsSystm3: "NA040600",
          ...common,
        },
      ]),
      detailIntro2: response([{ ...base, ...intro }]),
      detailPetTour2: response([{ contentid: contentId, ...pet }]),
    },
  };
}

/** 등록기가 받는 후보의 형태(`scripts/import-places.mjs` 머리말의 입력 계약). */
type Candidate = {
  tourApiId: string;
  nameKr: string;
  category: string;
  address: string;
  lat: number;
  lng: number;
  phone?: string;
  website?: string;
  thumbnailUrl?: string;
  descriptionKr?: string;
  descriptionEn?: string;
  usageGuideKr?: string;
  parking?: string;
  hours?: Record<string, { open: string; close: string } | null>;
};

function convert(snapshot: unknown): { candidate: Candidate; metaItem: { notes: string[] } } {
  return convertSnapshot(
    snapshot,
    Buffer.from(JSON.stringify(snapshot), "utf8"),
    "data/tour-api/place-999001-test.json",
    isHttpUrl,
    lib,
    null,
  );
}

describe("문의처 → 전화번호", () => {
  it("번호가 하나면 후보에 넣고 제외 안내를 만들지 않는다", () => {
    // 이 조합이 버그를 드러냈다 — 운영시간이 구조화되지 않는 장소에서
    // 전화번호는 저장됐는데 "제외했습니다" 안내가 함께 나갔다.
    const { candidate, metaItem } = convert(
      snapshotFor({ intro: { infocenter: "042-288-8300", usetime: "상시 개방" } }),
    );
    expect(candidate.phone).toBe("042-288-8300");
    expect(metaItem.notes.join("\n")).not.toContain("번호가 하나로 떨어지지");
  });

  it("번호가 둘이면 넣지 않고 그 사실을 안내한다", () => {
    // 장태산 실측값.
    const { candidate, metaItem } = convert(
      snapshotFor({
        intro: { infocenter: "시설문의 042-270-7885\n숲속의집 안내센터 042-583-0094" },
      }),
    );
    expect(candidate.phone).toBeUndefined();
    expect(metaItem.notes.join("\n")).toContain("번호가 하나로 떨어지지");
  });

  it("문의처가 미제공이면 안내도 만들지 않는다", () => {
    const { candidate, metaItem } = convert(snapshotFor({ intro: { infocenter: "" } }));
    expect(candidate.phone).toBeUndefined();
    expect(metaItem.notes.join("\n")).not.toContain("번호가 하나로 떨어지지");
  });
});

describe("원본 정보가 후보에 실린다", () => {
  it("소개·운영 안내·주차를 함께 넣는다", () => {
    const { candidate } = convert(
      snapshotFor({
        common: { overview: "메타세쿼이아 숲이 있는 휴양림이다." },
        intro: { usetime: "상시 개방", restdate: "연중무휴", parking: "가능<br>\n요금 (무료)" },
      }),
    );
    expect(candidate.descriptionKr).toBe("메타세쿼이아 숲이 있는 휴양림이다.");
    expect(candidate.parking).toBe("AVAILABLE");
    expect(candidate.usageGuideKr).toContain("[운영시간] 상시 개방");
    expect(candidate.usageGuideKr).toContain("[휴무] 연중무휴");
    // HTML 태그가 그대로 남으면 화면에 글자로 나온다.
    expect(candidate.usageGuideKr).not.toContain("<br>");
  });

  it("영문 소개를 만들어 내지 않는다", () => {
    const { candidate } = convert(snapshotFor({ common: { overview: "한국어 원문만 있다." } }));
    expect(candidate.descriptionKr).toBe("한국어 원문만 있다.");
    expect(candidate.descriptionEn).toBeUndefined();
  });

  it("주차가 미제공이면 넣지 않는다 — UNKNOWN은 주차 불가가 아니다", () => {
    const { candidate } = convert(snapshotFor({ intro: { parking: "" } }));
    expect(candidate.parking).toBeUndefined();
  });
});

describe("운영시간은 범위를 잃지 않는다", () => {
  it("장소 전체의 단일 시간대만 hours로 옮긴다", () => {
    const { candidate } = convert(
      snapshotFor({ intro: { usetime: "05:00~21:00", restdate: "연중무휴" } }),
    );
    expect(candidate.hours?.mon).toEqual({ open: "05:00", close: "21:00" });
  });

  it("시설별로 나뉜 시간은 hours에 넣지 않고 안내로 보존한다", () => {
    // 장태산 실측값. 출렁다리 운영시간이 휴양림 전체 시간이 되면 안 된다.
    const usetime =
      "[숲속어드벤처/출렁다리]- 3월~6월/9월~10월 09:00~18:00- 7월~8월 09:00~19:00[숙박시설]- 입실 15:00- 퇴실 11:00";
    const { candidate } = convert(snapshotFor({ intro: { usetime, restdate: "연중무휴" } }));
    expect(candidate.hours).toBeUndefined();
    expect(candidate.usageGuideKr).toContain("출렁다리");
    expect(candidate.usageGuideKr).toContain("입실 15:00");
  });

  it("계절 운영기간은 연중 시간표로 만들지 않는다", () => {
    // 옥천군 반려동물 놀이터 실측값. 12~2월은 닫는다.
    const { candidate } = convert(
      snapshotFor({
        intro: {
          usetime: "운영기간: 3월~11월<br>\n운영시간: 09:00~17:00",
          restdate: "매주 월요일",
        },
      }),
    );
    expect(candidate.hours).toBeUndefined();
    expect(candidate.usageGuideKr).toContain("운영기간: 3월~11월");
  });
});

describe("관광타입별 소개 필드", () => {
  it("음식점은 음식점 필드를 읽는다", () => {
    const { candidate } = convert(
      snapshotFor({
        contentTypeId: "39",
        common: { lclsSystm1: "FD", lclsSystm2: "FD05", lclsSystm3: "FD050100" },
        intro: { opentimefood: "10:00~19:00", restdatefood: "연중무휴", infocenterfood: "0507-1395-5672" },
      }),
    );
    expect(candidate.category).toBe("CAFE");
    expect(candidate.phone).toBe("0507-1395-5672");
    expect(candidate.hours?.sun).toEqual({ open: "10:00", close: "19:00" });
  });

  it("관광지 필드에 음식점 값을 넣어도 읽지 않는다", () => {
    // 필드 이름을 섞으면 "정보 없음"이 되는 것을 눈으로 확인한다.
    const { candidate } = convert(
      snapshotFor({
        contentTypeId: "39",
        common: { lclsSystm1: "FD", lclsSystm2: "FD05" },
        intro: { usetime: "10:00~19:00", restdate: "연중무휴" },
      }),
    );
    expect(candidate.hours).toBeUndefined();
    expect(candidate.usageGuideKr).toBeUndefined();
  });
});

describe("변환하지 않는 것", () => {
  it("분류가 정해지지 않은 관광타입은 던진다", () => {
    expect(() =>
      convert(snapshotFor({ contentTypeId: "32", common: { lclsSystm1: "AC", lclsSystm2: "AC03" } })),
    ).toThrow(/분류 검토 대상/);
  });

  it("동반 불가는 후보에서 제외한다", () => {
    expect(() => convert(snapshotFor({ pet: { acmpyTypeCd: "동반불가" } }))).toThrow(/동반 불가/);
  });

  it("조건을 후보에 넣지 않는다 — 사람이 관리자 화면에서 넣는다", () => {
    const { candidate } = convert(
      snapshotFor({ pet: { acmpyTypeCd: "전구역 동반가능", acmpyNeedMtr: "목줄 착용" } }),
    );
    expect(candidate).not.toHaveProperty("condition");
    expect(candidate).not.toHaveProperty("indoor");
    expect(candidate).not.toHaveProperty("leash");
  });
});

describe("검토 시트", () => {
  function sheetFor(snapshot: unknown) {
    const { candidate, metaItem } = convert(snapshot);
    return buildReviewSheet(
      {
        preparedAt: "2026-09-20T00:00:00.000Z",
        output: { importFile: "data/tour-api/import-test.json", itemCount: 1 },
        items: [metaItem],
      },
      [candidate],
    ) as string;
  }

  it("동반 범위 원문을 싣고 실내 허용을 제안하지 않는다", () => {
    const sheet = sheetFor(
      snapshotFor({ pet: { acmpyTypeCd: "전구역 동반가능", acmpyNeedMtr: "목줄 착용" } }),
    );
    expect(sheet).toContain("전구역 동반가능");
    expect(sheet).toContain("PlaceCondition.leash");
    // 공원의 "전 구역"은 실내 입장 확인이 아니다(D-26).
    expect(sheet).not.toContain("PlaceCondition.indoor");
    expect(sheet).toContain("INDOOR");
  });

  it("제안이 저장값이 아니라는 것을 시트가 말한다", () => {
    const sheet = sheetFor(snapshotFor());
    expect(sheet).toContain("제안일 뿐 저장값이 아니다");
    expect(sheet).toContain("수집일 ≠ 콘텐츠 수정일 ≠ 정책 확인일");
  });
});
