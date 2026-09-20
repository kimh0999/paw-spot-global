/**
 * TourAPI 수집·변환 파이프라인 테스트용 최소 픽스처 (결정 D-23).
 *
 * **실제 스냅샷을 복제하지 않는다.** 운영 데이터를 테스트 자료로 옮기면 원본이 바뀔 때
 * 테스트가 함께 흔들리고, 지워야 할 파일이 두 곳이 된다. 여기서는 형식만 같은
 * 가상의 장소를 만든다 — 이름에 `테스트`를 붙여 실제 장소와 섞이지 않게 한다.
 *
 * 검토자(`reviewer`)도 픽스처 안에서만 쓰는 값이다. 실제 사람의 검토를 대신하지 않는다.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  metaPathFor,
  reviewTargetHashes,
  sha256,
} from "../../../../scripts/tour-import-meta.mjs";

export const FIXTURE_REVIEWER = "fixture-reviewer@example.test";

export interface FixtureItem {
  tourApiId: string;
  nameKr: string;
  thumbnailUrl?: string | null;
}

/** 등록용 배열 1건. 관리자 폼과 같은 한국 좌표 범위 안의 값을 쓴다. */
export function importItem(item: FixtureItem): Record<string, unknown> {
  const row: Record<string, unknown> = {
    tourApiId: item.tourApiId,
    nameKr: item.nameKr,
    category: "TRAVEL",
    address: "대전광역시 서구 테스트로 1",
    lat: 36.2,
    lng: 127.3,
  };
  if (item.thumbnailUrl) row.thumbnailUrl = item.thumbnailUrl;
  return row;
}

/** 메타 항목 1건. 이미지가 있으면 공공누리 제1유형 이미지로 둔다. */
export function metaItem(item: FixtureItem): Record<string, unknown> {
  return {
    tourApiId: item.tourApiId,
    nameKr: item.nameKr,
    category: "TRAVEL",
    source: {
      kind: "TOUR_API",
      provider: "한국관광공사",
      service: "KorPetTourService2",
      snapshotFile: `data/tour-api/place-${item.tourApiId}-fixture.json`,
      sha256: sha256(`snapshot-${item.tourApiId}`),
      contentId: item.tourApiId,
      contentTypeId: "12",
      fetchedAt: "2026-09-15T00:00:00.000Z",
      reviewStatus: "UNREVIEWED",
      responseFetchedAt: {
        detailCommon2: "2026-09-15T00:00:00.000Z",
        detailIntro2: "2026-09-15T00:00:00.000Z",
        detailPetTour2: "2026-09-15T00:00:00.000Z",
      },
    },
    image: item.thumbnailUrl
      ? {
          cpyrhtDivCd: "Type1",
          selectionPolicy: "AUTO_SELECT_TYPE1_ONLY",
          selectedField: "firstimage",
          imageUrl: item.thumbnailUrl,
          licenseType: "KOGL_TYPE1",
          licenseUrl: "https://www.kogl.or.kr/info/licenseType1.do",
          provider: "한국관광공사",
          sourceUrl: "https://kto.visitkorea.or.kr",
          copyrightHolder: null,
          workTitle: null,
          createdYear: null,
          missingAttributionFields: ["copyrightHolder", "workTitle", "createdYear"],
        }
      : { cpyrhtDivCd: null, selectionPolicy: "AUTO_SELECT_TYPE1_ONLY", selectedField: null, imageUrl: null },
    notes: [],
  };
}

export interface WrittenPair {
  dir: string;
  importPath: string;
  metaPath: string;
  /** 저장소 루트로 쓸 경로. 스크립트는 여기를 기준으로 상대 경로를 만든다. */
  projectRoot: string;
  relativeImportPath: string;
}

/**
 * 등록용 배열 + 메타를 임시 폴더에 쓴다.
 *
 * `reviewed: true`면 지금 파일 내용으로 검토 대상 해시를 계산해 넣는다 —
 * 즉 "실제로 이 내용을 검토한" 상태를 만든다.
 */
export function writeImportPair(options: {
  items: FixtureItem[];
  reviewed?: boolean;
  /** 메타를 쓰지 않는다. 생성물 한쪽만 남은 상태를 만들 때 쓴다. */
  omitMeta?: boolean;
  /** 메타를 쓴 뒤 배열만 바꿔치기한다. 검토 이후 데이터가 바뀐 상태를 만든다. */
  tamperImportAfterReview?: boolean;
  mutateMeta?: (meta: Record<string, unknown>) => void;
}): WrittenPair {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pawspot-tour-"));
  const dir = path.join(projectRoot, "data", "tour-api");
  fs.mkdirSync(dir, { recursive: true });

  const baseName = "import-fixture";
  const importPath = path.join(dir, `${baseName}.json`);
  const metaPath = metaPathFor(importPath);
  const relativeImportPath = `data/tour-api/${baseName}.json`;

  const rows = options.items.map(importItem);
  const contents = JSON.stringify(rows, null, 2) + "\n";
  const metaItems = options.items.map(metaItem);

  const meta: Record<string, unknown> = {
    formatVersion: 2,
    preparationId: "fixture-preparation-id",
    tool: { name: "fixture", version: 1 },
    preparedAt: "2026-09-18T00:00:00.000Z",
    output: {
      importFile: relativeImportPath,
      sha256: sha256(contents),
      itemCount: rows.length,
      tourApiIds: options.items.map((item) => item.tourApiId),
    },
    items: metaItems,
    review: {
      status: "UNREVIEWED",
      reviewedBy: null,
      reviewedAt: null,
      target: { importSha256: null, itemsSha256: null },
    },
  };

  if (options.reviewed) {
    meta.review = {
      status: "REVIEWED",
      reviewedBy: FIXTURE_REVIEWER,
      reviewedAt: "2026-09-18T01:00:00.000Z",
      target: reviewTargetHashes(Buffer.from(contents, "utf8"), metaItems),
    };
  }
  options.mutateMeta?.(meta);

  fs.writeFileSync(importPath, contents, "utf8");
  if (!options.omitMeta) {
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + "\n", "utf8");
  }
  if (options.tamperImportAfterReview) {
    const tampered = rows.map((row) => ({ ...row, nameKr: `${row.nameKr} (수정됨)` }));
    fs.writeFileSync(importPath, JSON.stringify(tampered, null, 2) + "\n", "utf8");
  }

  return { dir, importPath, metaPath, projectRoot, relativeImportPath };
}

export function cleanup(pair: WrittenPair): void {
  fs.rmSync(pair.projectRoot, { recursive: true, force: true });
}
