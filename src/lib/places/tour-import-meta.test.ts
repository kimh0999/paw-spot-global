import { afterEach, describe, expect, it } from "vitest";

// 스크립트에서 직접 가져온다. 규칙을 두 곳에 적어 두면 갈라진다.
import {
  loadReviewedImport,
  MetaError,
  metaPathFor,
} from "../../../scripts/tour-import-meta.mjs";
import { attributionRowFor } from "../../../scripts/import-places.mjs";

import {
  cleanup,
  FIXTURE_REVIEWER,
  metaItem,
  writeImportPair,
  type WrittenPair,
} from "./__fixtures__/tour-import";

/**
 * 결정 D-23 — **메타를 빼서 사람 검토를 건너뛸 수 없다.**
 *
 * 검사는 전부 DB에 붙기 전에 끝난다. 여기서 막지 못하면 사람이 보지 않은 데이터가
 * 운영 DB에 들어가고, 그 뒤에는 어느 행이 검토된 것인지 구분할 수 없다.
 */

const IMAGE = "https://tong.visitkorea.or.kr/cms/resource/42/fixture_image2_1.jpg";
const pairs: WrittenPair[] = [];

function makePair(options: Parameters<typeof writeImportPair>[0]): WrittenPair {
  const pair = writeImportPair(options);
  pairs.push(pair);
  return pair;
}

afterEach(() => {
  while (pairs.length > 0) cleanup(pairs.pop()!);
});

async function load(pair: WrittenPair) {
  return loadReviewedImport(pair.relativeImportPath, pair.projectRoot);
}

describe("등록 전 검토 계약", () => {
  it("검토를 마친 파일은 형식·검토 모두 통과한다", async () => {
    const pair = makePair({
      items: [{ tourApiId: "T-1", nameKr: "테스트 휴양림", thumbnailUrl: IMAGE }],
      reviewed: true,
    });
    const loaded = await load(pair);

    expect(loaded.issues).toEqual([]);
    expect(loaded.reviewIssues).toEqual([]);
    expect(loaded.meta.review.reviewedBy).toBe(FIXTURE_REVIEWER);
  });

  it("메타가 없으면 읽기 자체가 거부된다 — 생성물 한쪽만 남은 상태", async () => {
    const pair = makePair({
      items: [{ tourApiId: "T-1", nameKr: "테스트 휴양림" }],
      omitMeta: true,
    });
    await expect(load(pair)).rejects.toBeInstanceOf(MetaError);
  });

  it("검토 전이면 형식은 통과하고 검토만 대기로 갈린다", async () => {
    const pair = makePair({ items: [{ tourApiId: "T-1", nameKr: "테스트 휴양림" }] });
    const loaded = await load(pair);

    // 검토 전 데이터도 형식은 로컬에서 확인할 수 있어야 한다.
    expect(loaded.issues).toEqual([]);
    expect(loaded.reviewIssues.join(" ")).toContain("사람 검토 전");
  });

  it("검토 뒤에 배열이 바뀌면 옛 검토 기록으로 통과하지 못한다", async () => {
    const pair = makePair({
      items: [{ tourApiId: "T-1", nameKr: "테스트 휴양림" }],
      reviewed: true,
      tamperImportAfterReview: true,
    });
    const loaded = await load(pair);

    // 파일 해시가 메타와 어긋나므로 형식 검사에서 먼저 걸린다.
    expect(loaded.issues.join(" ")).toContain("해시");
  });

  it("검토 뒤에 메타 items만 바꾸면 검토 대상 해시가 어긋난다", async () => {
    const pair = makePair({
      items: [{ tourApiId: "T-1", nameKr: "테스트 휴양림", thumbnailUrl: IMAGE }],
      reviewed: true,
      mutateMeta: (meta) => {
        const items = meta.items as Array<Record<string, unknown>>;
        // 출처만 슬쩍 바꾼다. 배열 파일은 그대로라 해시가 맞는다.
        (items[0].image as Record<string, unknown>).copyrightHolder = "지어낸 저작권자";
      },
    });
    const loaded = await load(pair);

    expect(loaded.issues).toEqual([]);
    expect(loaded.reviewIssues.join(" ")).toContain("메타 items와 다릅니다");
  });

  it("다른 파일의 메타를 붙이면 경로가 달라 걸린다", async () => {
    const pair = makePair({
      items: [{ tourApiId: "T-1", nameKr: "테스트 휴양림" }],
      reviewed: true,
      mutateMeta: (meta) => {
        (meta.output as Record<string, unknown>).importFile = "data/tour-api/import-other.json";
      },
    });
    const loaded = await load(pair);

    expect(loaded.issues.join(" ")).toContain("메타가 설명하는 파일이 다릅니다");
  });

  it("건수가 어긋나면 거부한다", async () => {
    const pair = makePair({
      items: [{ tourApiId: "T-1", nameKr: "가" }, { tourApiId: "T-2", nameKr: "나" }],
      reviewed: true,
      mutateMeta: (meta) => {
        (meta.output as Record<string, unknown>).itemCount = 1;
      },
    });
    const loaded = await load(pair);

    expect(loaded.issues.join(" ")).toContain("건수가 다릅니다");
  });

  it("메타 items에 없는 장소가 배열에 있으면 거부한다", async () => {
    const pair = makePair({
      items: [{ tourApiId: "T-1", nameKr: "가" }, { tourApiId: "T-2", nameKr: "나" }],
      reviewed: true,
      mutateMeta: (meta) => {
        const items = meta.items as Array<Record<string, unknown>>;
        items[1] = metaItem({ tourApiId: "T-9", nameKr: "다" });
      },
    });
    const loaded = await load(pair);

    expect(loaded.issues.join(" ")).toContain("콘텐츠 ID가 일치하지 않습니다");
  });

  it("검토자나 검토 시각이 비어 있으면 통과하지 못한다", async () => {
    const pair = makePair({
      items: [{ tourApiId: "T-1", nameKr: "가" }],
      reviewed: true,
      mutateMeta: (meta) => {
        (meta.review as Record<string, unknown>).reviewedBy = "";
      },
    });
    const loaded = await load(pair);

    expect(loaded.reviewIssues.join(" ")).toContain("검토자");
  });

  it("메타 경로 규약은 같은 이름 + .meta.json 이다", () => {
    expect(metaPathFor("/x/import-a.json").replace(/\\/g, "/")).toBe("/x/import-a.meta.json");
  });
});

/**
 * 등록기가 메타의 이미지 정보를 `PlaceImageAttribution` 행으로 옮기는 규칙 (D-22).
 * **검토 기록은 만들지 않는다** — 그건 사람이 관리자 화면에서 한다.
 */
describe("이미지 출처 행 만들기", () => {
  const item = { tourApiId: "T-1", nameKr: "가", thumbnailUrl: IMAGE };

  it("메타 이미지와 후보 이미지가 같으면 행을 만든다", () => {
    const row = attributionRowFor(item, metaItem(item));
    expect(row).not.toBeNull();
    if (!row) return;
    expect(row.imageUrl).toBe(IMAGE);
    expect(row.provider).toBe("한국관광공사");
    expect(row.licenseType).toBe("KOGL_TYPE1");
  });

  it("확인되지 않은 저작권자·작성연도·저작물명을 지어내지 않는다", () => {
    const row = attributionRowFor(item, metaItem(item));
    expect(row).not.toBeNull();
    if (!row) return;
    expect(row.copyrightHolder).toBeNull();
    expect(row.workTitle).toBeNull();
    expect(row.createdYear).toBeNull();
  });

  it("후보의 이미지가 메타와 다르면 행을 만들지 않는다", () => {
    const other = { ...item, thumbnailUrl: "https://example.org/other.jpg" };
    expect(attributionRowFor(other, metaItem(item))).toBeNull();
  });

  it("이미지가 없으면 행을 만들지 않는다", () => {
    const noImage = { tourApiId: "T-1", nameKr: "가" };
    expect(attributionRowFor(noImage, metaItem(noImage))).toBeNull();
  });

  it("출처 링크가 http/https가 아니면 행을 만들지 않는다", () => {
    const meta = metaItem(item) as { image: Record<string, unknown> };
    meta.image.sourceUrl = "javascript:alert(1)";
    expect(attributionRowFor(item, meta)).toBeNull();
  });
});
