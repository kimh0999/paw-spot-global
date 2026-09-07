import { describe, expect, it } from "vitest";

import {
  DEFAULT_PLACE_LIST_PARAMS,
  parsePlaceListParams,
  serializePlaceListParams,
} from "@/lib/places/place-list-params";
import type { PlaceListParams } from "@/lib/places/place-list-params";

function parse(query: string): PlaceListParams {
  return parsePlaceListParams(new URLSearchParams(query));
}

function serialize(query: string, patch: Partial<PlaceListParams>): string {
  return serializePlaceListParams(new URLSearchParams(query), patch);
}

describe("parsePlaceListParams", () => {
  it("빈 주소는 전부 기본값이다", () => {
    expect(parse("")).toEqual(DEFAULT_PLACE_LIST_PARAMS);
  });

  it("정상 값을 그대로 읽는다", () => {
    expect(
      parse("category=cafe&q=둔산&indoor=indoor&carrier=not-required&size=large&recent=30days&sort=distance"),
    ).toEqual({
      category: "cafe",
      searchQuery: "둔산",
      filters: {
        indoor: "indoor",
        carrier: "not-required",
        dogSize: "large",
        recent: "30days",
      },
      sortOption: "distance",
    });
  });

  it("허용 목록에 없는 값은 기본값으로 되돌린다", () => {
    expect(parse("category=hotel&indoor=nope&carrier=&size=xl&recent=1day&sort=cheapest")).toEqual(
      DEFAULT_PLACE_LIST_PARAMS,
    );
  });

  // D-12로 삭제된 옵션. 옛 링크를 열어도 화면이 깨지지 않고 필터만 풀린다.
  it("삭제된 exclude-unknown 링크는 실내 필터 없음으로 읽는다", () => {
    expect(parse("indoor=exclude-unknown").filters.indoor).toBe("all");
  });

  it("같은 파라미터가 여러 번이면 첫 값만 쓴다", () => {
    expect(parse("indoor=outdoor&indoor=indoor").filters.indoor).toBe("outdoor");
    expect(parse("sort=distance&sort=recent").sortOption).toBe("distance");
  });

  it("검색어는 자유 문자열이라 그대로 통과시킨다", () => {
    expect(parse("q=%20cafe%20").searchQuery).toBe(" cafe ");
  });

  it("이 모듈과 무관한 파라미터는 읽지 않는다", () => {
    expect(parse("lat=36.3&lng=127.4&dogId=abc")).toEqual(DEFAULT_PLACE_LIST_PARAMS);
  });
});

describe("serializePlaceListParams", () => {
  it("기본값은 주소에 남기지 않는다", () => {
    expect(serialize("", { category: "all", sortOption: "recent" })).toBe("");
    expect(serialize("", { filters: DEFAULT_PLACE_LIST_PARAMS.filters })).toBe("");
  });

  it("기본값으로 되돌리면 기존 파라미터를 지운다", () => {
    expect(serialize("category=cafe&sort=distance", { category: "all" })).toBe(
      "sort=distance",
    );
  });

  it("patch에 없는 항목은 건드리지 않는다", () => {
    expect(serialize("category=cafe&indoor=indoor", { sortOption: "distance" })).toBe(
      "category=cafe&indoor=indoor&sort=distance",
    );
  });

  it("이 모듈과 무관한 파라미터는 보존한다", () => {
    const result = serialize("lat=36.3&lng=127.4&dogId=abc", {
      filters: { ...DEFAULT_PLACE_LIST_PARAMS.filters, indoor: "indoor" },
    });
    const params = new URLSearchParams(result);
    expect(params.get("lat")).toBe("36.3");
    expect(params.get("lng")).toBe("127.4");
    expect(params.get("dogId")).toBe("abc");
    expect(params.get("indoor")).toBe("indoor");
  });

  it("필터 초기화는 네 개 필터만 지우고 나머지는 남긴다", () => {
    const result = serialize(
      "category=cafe&q=둔산&sort=distance&indoor=indoor&carrier=can-bring&size=large&recent=30days&lat=36.3",
      { filters: DEFAULT_PLACE_LIST_PARAMS.filters },
    );
    const params = new URLSearchParams(result);
    expect(params.get("indoor")).toBeNull();
    expect(params.get("carrier")).toBeNull();
    expect(params.get("size")).toBeNull();
    expect(params.get("recent")).toBeNull();
    expect(params.get("category")).toBe("cafe");
    expect(params.get("q")).toBe("둔산");
    expect(params.get("sort")).toBe("distance");
    expect(params.get("lat")).toBe("36.3");
  });

  it("검색어는 앞뒤 공백을 떼고, 공백뿐이면 지운다", () => {
    expect(serialize("", { searchQuery: "  둔산  " })).toBe("q=%EB%91%94%EC%82%B0");
    expect(serialize("q=old", { searchQuery: "   " })).toBe("");
  });

  it("중복 파라미터는 하나로 정리한다", () => {
    expect(serialize("indoor=outdoor&indoor=indoor", {
      filters: { ...DEFAULT_PLACE_LIST_PARAMS.filters, indoor: "indoor" },
    })).toBe("indoor=indoor");
  });

  it("직렬화한 주소를 다시 읽으면 같은 상태가 된다", () => {
    const state: PlaceListParams = {
      category: "restaurant",
      searchQuery: "카페",
      filters: {
        indoor: "partial-area",
        carrier: "can-bring",
        dogSize: "medium",
        recent: "90days",
      },
      sortOption: "indoor-first",
    };
    expect(parse(serialize("", state))).toEqual(state);
  });
});
