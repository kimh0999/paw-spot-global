/**
 * 등록용 배열에 딸린 **검토 메타데이터**의 형식과 검사 규칙 (결정 D-23).
 *
 * 변환(`prepare-tour-import.cjs`)·검토(`review-tour-import.cjs`)·등록(`import-places.mjs`)이
 * 같은 규칙을 봐야 하므로 한 곳에 둔다. ESM으로 두는 이유는 등록기가 ESM이기 때문이고,
 * `.cjs` 스크립트는 `await import()`로 가져간다.
 *
 * **해시는 내용이 그대로인지 확인하는 수단이지 검토자 신원을 인증하는 전자서명이 아니다.**
 * 파일을 쓸 수 있는 사람은 검토 기록도 고칠 수 있다. 이 검사가 막는 것은
 * "데이터를 바꾼 뒤 옛 검토 기록으로 통과시키는 것"과 "다른 파일의 메타를 붙이는 것"이다.
 */
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

export const META_FORMAT_VERSION = 2;
export const META_SUFFIX = ".meta.json";

export class MetaError extends Error {}

export function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

/** 등록용 배열 파일 경로 → 메타 파일 경로. 규약은 "같은 이름 + .meta.json"이다. */
export function metaPathFor(importPath) {
  const dir = path.dirname(importPath);
  const base = path.basename(importPath).replace(/\.json$/i, "");
  return path.join(dir, `${base}${META_SUFFIX}`);
}

/** 저장소 안에서의 경로. 구분자를 `/`로 고정해 OS가 달라도 같은 문자열이 되게 한다. */
export function recordPath(projectRoot, filePath) {
  return path.relative(projectRoot, filePath).split(path.sep).join("/");
}

/**
 * 검토가 가리키는 대상 해시.
 *
 * 등록용 배열 파일의 바이트와 메타의 `items`를 함께 묶는다. 배열만 묶으면 출처·이미지
 * 정보를 메타에서 바꿔치기할 수 있고, 메타만 묶으면 배열을 바꿀 수 있다.
 */
export function reviewTargetHashes(importBytes, items) {
  return {
    importSha256: sha256(importBytes),
    itemsSha256: sha256(JSON.stringify(items)),
  };
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

function isIsoTimestamp(value) {
  return isNonEmptyString(value) && Number.isFinite(Date.parse(value));
}

/**
 * 메타 파일의 모양 검사. **DB에 붙기 전에** 끝난다.
 * 내용의 옳고 그름이 아니라 "이 메타가 이 배열을 설명하는가"만 본다.
 */
export function validateMetaShape(meta) {
  const issues = [];
  if (meta?.formatVersion !== META_FORMAT_VERSION) {
    issues.push(`메타 formatVersion이 ${META_FORMAT_VERSION}이 아닙니다.`);
    return issues;
  }
  if (!isNonEmptyString(meta.preparationId)) issues.push("preparationId가 없습니다.");
  if (!isIsoTimestamp(meta.preparedAt)) issues.push("preparedAt이 유효한 시각이 아닙니다.");

  const output = meta.output;
  if (!output || typeof output !== "object") {
    issues.push("output이 없습니다.");
  } else {
    if (!isNonEmptyString(output.importFile)) issues.push("output.importFile이 없습니다.");
    if (!/^[0-9a-f]{64}$/.test(output.sha256 ?? "")) issues.push("output.sha256이 없습니다.");
    if (!Number.isInteger(output.itemCount) || output.itemCount < 1) {
      issues.push("output.itemCount가 1 이상의 정수가 아닙니다.");
    }
    if (!Array.isArray(output.tourApiIds)) issues.push("output.tourApiIds가 배열이 아닙니다.");
  }

  if (!Array.isArray(meta.items) || meta.items.length === 0) {
    issues.push("items가 비어 있습니다.");
  } else {
    for (const [index, item] of meta.items.entries()) {
      if (!isNonEmptyString(item?.tourApiId)) issues.push(`items[${index}].tourApiId가 없습니다.`);
      if (!item?.source || typeof item.source !== "object") {
        issues.push(`items[${index}].source가 없습니다.`);
        continue;
      }
      // 수집 시각은 정책 확인일이 아니다. 두 값을 같은 칸에 담지 않기 위해 이름을 분리해 둔다.
      if (item.source.kind !== "MANUAL" && !isIsoTimestamp(item.source.fetchedAt)) {
        issues.push(`items[${index}].source.fetchedAt이 유효한 시각이 아닙니다.`);
      }
    }
  }

  const review = meta.review;
  if (!review || typeof review !== "object") {
    issues.push("review가 없습니다.");
  } else if (review.status !== "UNREVIEWED" && review.status !== "REVIEWED") {
    issues.push("review.status는 UNREVIEWED 또는 REVIEWED여야 합니다.");
  }
  return issues;
}

/**
 * 메타가 이 배열을 설명하는지 대조한다.
 *
 * 등록용 배열의 항목과 메타의 항목이 **건수와 콘텐츠 ID 모두** 맞아야 한다.
 * 한쪽에만 있는 항목이 있으면 통과시키지 않는다 — 조용히 걸러 넣으면
 * 사람이 검토하지 않은 장소가 섞인다.
 */
export function crossCheck({ meta, items, importBytes, importRecordPath }) {
  const issues = [];
  const actualSha = sha256(importBytes);

  if (meta.output?.sha256 !== actualSha) {
    issues.push("등록용 파일의 해시가 메타에 적힌 값과 다릅니다. 파일이 변경됐습니다.");
  }
  if (meta.output?.importFile !== importRecordPath) {
    issues.push(
      `메타가 설명하는 파일이 다릅니다 (메타: ${meta.output?.importFile} / 지정: ${importRecordPath}).`,
    );
  }
  if (meta.output?.itemCount !== items.length) {
    issues.push(`건수가 다릅니다 (메타 ${meta.output?.itemCount} / 배열 ${items.length}).`);
  }
  if (meta.items?.length !== items.length) {
    issues.push(`메타 items 건수가 배열과 다릅니다 (${meta.items?.length} / ${items.length}).`);
  }

  const arrayIds = items.map((item) => String(item?.tourApiId ?? ""));
  const metaIds = (meta.items ?? []).map((item) => String(item?.tourApiId ?? ""));
  const declaredIds = (meta.output?.tourApiIds ?? []).map(String);

  const sorted = (list) => [...list].sort().join(",");
  if (sorted(arrayIds) !== sorted(metaIds)) {
    issues.push("배열과 메타 items의 콘텐츠 ID가 일치하지 않습니다.");
  }
  if (sorted(arrayIds) !== sorted(declaredIds)) {
    issues.push("배열과 output.tourApiIds가 일치하지 않습니다.");
  }
  if (new Set(arrayIds).size !== arrayIds.length) {
    issues.push("같은 콘텐츠 ID가 배열에 두 번 이상 있습니다.");
  }
  return issues;
}

/**
 * 사람 검토 기록 검사.
 *
 * 검토 대상 해시가 지금 파일과 맞아야 한다. 변환을 다시 돌려 배열이 바뀌면
 * 이전 검토 기록으로는 통과하지 못한다.
 */
export function checkReview({ meta, importBytes }) {
  const issues = [];
  const review = meta.review ?? {};
  if (review.status !== "REVIEWED") {
    issues.push("사람 검토 전입니다 (review.status=UNREVIEWED).");
    return issues;
  }
  if (!isNonEmptyString(review.reviewedBy)) issues.push("검토자(review.reviewedBy)가 없습니다.");
  if (!isIsoTimestamp(review.reviewedAt)) issues.push("검토 시각(review.reviewedAt)이 없습니다.");

  const expected = reviewTargetHashes(importBytes, meta.items);
  const target = review.target ?? {};
  if (target.importSha256 !== expected.importSha256) {
    issues.push("검토 대상 해시가 지금 등록용 파일과 다릅니다. 검토 이후 데이터가 바뀌었습니다.");
  }
  if (target.itemsSha256 !== expected.itemsSha256) {
    issues.push("검토 대상 해시가 지금 메타 items와 다릅니다. 검토 이후 메타가 바뀌었습니다.");
  }
  return issues;
}

async function readJson(filePath) {
  const bytes = await fs.readFile(filePath);
  return { bytes, value: JSON.parse(bytes.toString("utf8").replace(/^﻿/, "")) };
}

/**
 * 등록용 배열과 메타를 함께 읽고 전부 검사한다. **네트워크·DB에 붙지 않는다.**
 *
 * 형식 문제(`issues`)와 사람 검토 대기(`reviewIssues`)를 나눠 돌려준다 —
 * 검토 전 데이터도 형식은 로컬에서 확인할 수 있어야 한다.
 */
export async function loadReviewedImport(importPath, projectRoot) {
  const resolved = path.resolve(projectRoot, importPath);
  const metaPath = metaPathFor(resolved);

  let importFile;
  try {
    importFile = await readJson(resolved);
  } catch {
    throw new MetaError(`등록용 파일을 읽지 못했습니다: ${recordPath(projectRoot, resolved)}`);
  }
  if (!Array.isArray(importFile.value)) {
    throw new MetaError("등록용 파일의 최상위가 배열이어야 합니다.");
  }

  let metaFile;
  try {
    metaFile = await readJson(metaPath);
  } catch {
    // 메타 없이 DB에 쓰는 길을 열어 두면 검토를 건너뛸 수 있다.
    throw new MetaError(
      `검토 메타데이터가 없습니다: ${recordPath(projectRoot, metaPath)}\n` +
        "변환으로 만든 파일은 같은 이름의 .meta.json과 함께 보관하세요. " +
        "직접 만든 배열은 scripts/review-tour-import.cjs --manual 로 메타를 만듭니다.",
    );
  }

  const meta = metaFile.value;
  const issues = [
    ...validateMetaShape(meta),
    ...(validateMetaShape(meta).length > 0
      ? []
      : crossCheck({
          meta,
          items: importFile.value,
          importBytes: importFile.bytes,
          importRecordPath: recordPath(projectRoot, resolved),
        })),
  ];

  const reviewIssues =
    issues.length > 0 ? [] : checkReview({ meta, importBytes: importFile.bytes });

  return {
    importPath: resolved,
    metaPath,
    items: importFile.value,
    importBytes: importFile.bytes,
    meta,
    issues,
    reviewIssues,
  };
}
