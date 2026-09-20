// 등록용 배열을 사람이 검토하고 그 결과를 메타데이터에 기록한다.
// **DB·API에 접속하지 않는다.**
//
//   확인만:  node scripts/review-tour-import.cjs --file "data/tour-api/import-....json"
//   기록:    node scripts/review-tour-import.cjs --file "..." --reviewer you@example.com --confirm
//   수기 배열: 위 명령에 --manual 을 붙이면 메타가 없는 배열에 메타를 만들어 함께 기록한다.
//
// 이 검토는 **수집·변환 결과가 원본과 맞는지**를 확인하는 절차다.
// 장소의 실제 반려견 정책을 확인한 기록(Verification)도, 서비스 공개 승인도 아니다.
// 공개는 관리자 화면에서 조건·확인 기록을 채우고 따로 전환해야 한다.
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { pathToFileURL } = require('node:url');

class ReviewError extends Error {}

const printable = value => String(value).replace(/[\x00-\x1f\x7f]/g, ' ');

function errorDetail(error) {
  const code = /^[A-Z][A-Z0-9_]{0,63}$/.test(error?.code || '') ? error.code : null;
  if (code) return `처리 중 오류가 발생했습니다 (${code})`;
  if (error instanceof SyntaxError) return '문법이 올바르지 않습니다 (SyntaxError)';
  return '처리 중 오류가 발생했습니다';
}

function parseArgs(argv) {
  const args = { file: null, reviewer: null, confirm: false, manual: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--file') { args.file = argv[i + 1]; i += 1; }
    else if (argv[i] === '--reviewer') { args.reviewer = argv[i + 1]; i += 1; }
    else if (argv[i] === '--confirm') args.confirm = true;
    else if (argv[i] === '--manual') args.manual = true;
    else throw new ReviewError(`알 수 없는 옵션입니다: ${printable(argv[i])}`);
  }
  if (!args.file) {
    throw new ReviewError(
      '사용법: node scripts/review-tour-import.cjs --file "등록용 JSON" [--reviewer <식별자> --confirm] [--manual]',
    );
  }
  return args;
}

/** 수기로 만든 배열에 붙일 최소 메타. 출처를 지어내지 않고 "직접 작성"임을 남긴다. */
function manualMeta(meta, items, importRecordPath, preparedAt) {
  return {
    formatVersion: 2,
    preparationId: randomUUID(),
    tool: { name: 'review-tour-import.cjs --manual', version: 1 },
    preparedAt,
    output: {
      importFile: importRecordPath,
      sha256: meta.sha256,
      itemCount: items.length,
      tourApiIds: items.map(item => String(item?.tourApiId ?? '')),
    },
    items: items.map(item => ({
      tourApiId: String(item?.tourApiId ?? ''),
      nameKr: typeof item?.nameKr === 'string' ? item.nameKr : '',
      category: typeof item?.category === 'string' ? item.category : '',
      // 수기 파일은 수집 출처가 없다. TourAPI에서 온 것처럼 적지 않는다.
      source: { kind: 'MANUAL', snapshotFile: null, sha256: null, fetchedAt: null },
      image: { selectedField: null, imageUrl: null },
      notes: ['직접 작성한 후보 파일입니다. 출처 정보는 수집 기록이 아니라 작성자가 채운 값입니다.'],
    })),
    review: {
      status: 'UNREVIEWED',
      reviewedBy: null,
      reviewedAt: null,
      target: { importSha256: null, itemsSha256: null },
    },
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const projectRoot = path.resolve(__dirname, '..');
  const lib = await import(
    pathToFileURL(path.join(projectRoot, 'scripts', 'tour-import-meta.mjs')).href
  );

  const importPath = path.resolve(projectRoot, args.file);
  const metaPath = lib.metaPathFor(importPath);
  const importRecordPath = lib.recordPath(projectRoot, importPath);

  let importBytes;
  try {
    importBytes = await fs.readFile(importPath);
  } catch (error) {
    throw new ReviewError(`등록용 파일을 읽지 못했습니다: ${errorDetail(error)}.`);
  }
  let items;
  try {
    items = JSON.parse(importBytes.toString('utf8').replace(/^﻿/, ''));
  } catch (error) {
    throw new ReviewError(`등록용 JSON 해석 실패: ${errorDetail(error)}.`);
  }
  if (!Array.isArray(items) || items.length === 0) {
    throw new ReviewError('등록용 파일의 최상위가 비어 있지 않은 배열이어야 합니다.');
  }

  let metaExists = true;
  try {
    await fs.access(metaPath);
  } catch {
    metaExists = false;
  }

  if (!metaExists) {
    if (!args.manual) {
      throw new ReviewError(
        `검토 메타데이터가 없습니다: ${lib.recordPath(projectRoot, metaPath)}\n` +
          '변환으로 만든 파일이라면 같은 이름의 .meta.json을 함께 두세요.\n' +
          '직접 만든 배열이라면 --manual 을 붙여 메타를 만들고 검토를 기록합니다.',
      );
    }
    const created = manualMeta(
      { sha256: lib.sha256(importBytes) },
      items,
      importRecordPath,
      new Date().toISOString(),
    );
    try {
      const handle = await fs.open(metaPath, 'wx');
      try {
        await handle.writeFile(JSON.stringify(created, null, 2) + '\n', 'utf8');
      } finally {
        await handle.close();
      }
    } catch (error) {
      throw new ReviewError(`메타 파일 저장 실패: ${errorDetail(error)}.`);
    }
    console.log(`수기 배열용 메타를 만들었습니다: ${printable(lib.recordPath(projectRoot, metaPath))}`);
  }

  const loaded = await lib.loadReviewedImport(importPath, projectRoot);
  if (loaded.issues.length > 0) {
    for (const issue of loaded.issues) console.error(`  - ${printable(issue)}`);
    throw new ReviewError('메타와 등록용 배열이 맞지 않습니다. 검토를 기록하지 않았습니다.');
  }

  console.log(`검토 대상: ${printable(importRecordPath)} · ${loaded.items.length}건`);
  console.log('');
  for (const item of loaded.meta.items) {
    const candidate = loaded.items.find(row => String(row.tourApiId) === String(item.tourApiId));
    console.log(`[${printable(item.tourApiId)}] ${printable(item.nameKr)} · ${printable(item.category)}`);
    console.log(`  주소   ${printable(candidate?.address ?? '')}`);
    console.log(`  좌표   위도 ${candidate?.lat} / 경도 ${candidate?.lng}`);
    console.log(`  원본   ${printable(item.source.snapshotFile ?? '직접 작성')} (수집 ${printable(item.source.fetchedAt ?? '없음')})`);
    console.log(`  홈페이지 ${printable(candidate?.website ?? '없음')}`);
    console.log(`  이미지 ${printable(item.image?.imageUrl ?? '없음')}`);
    if (item.image?.imageUrl) {
      console.log(`         이용 조건 ${printable(item.image.licenseType ?? '미확인')} · 출처 ${printable(item.image.provider ?? '미확인')}`);
      const missing = item.image.missingAttributionFields ?? [];
      if (missing.length > 0) {
        console.log(`         비어 있는 출처 항목: ${missing.join(', ')} — 관리자 화면에서 채워야 공개됩니다.`);
      }
    }
    console.log(`  분류   ${printable(item.category)} ← ${printable(item.classification?.reason ?? '근거 기록 없음')}`);
    if (item.contentModifiedAt) {
      console.log(`         콘텐츠 수정일 ${printable(item.contentModifiedAt)} (수집일·정책 확인일과 다른 값입니다)`);
    }

    // 원문 → 제안 값 → 근거 → 미확인. 저장값이 아니라 **대조표**다.
    const petPolicy = item.petPolicy;
    if (petPolicy) {
      console.log('  반려견 동반 원문');
      for (const [field, value] of Object.entries(petPolicy.raw ?? {})) {
        if (value) console.log(`    ${field}: ${printable(value)}`);
      }
      for (const proposal of petPolicy.proposals ?? []) {
        console.log(`    제안 → ${printable(proposal.target)} = ${printable(proposal.value)} (근거 "${printable(proposal.quote)}")`);
      }
      for (const conflict of petPolicy.conflicts ?? []) {
        console.log(`    충돌 → ${printable(conflict.reason)}`);
      }
      for (const entry of petPolicy.unresolved ?? []) {
        console.log(`    미확인 → ${printable(entry.target)}: ${printable(entry.reason)}`);
      }
    }
    if (item.operatingHours) {
      console.log(
        item.operatingHours.proposal
          ? `  운영시간 제안 ${printable(item.operatingHours.proposal.basis)}`
          : `  운영시간 제안 없음 — ${printable(item.operatingHours.reason ?? '')}`,
      );
    }
    for (const note of item.notes ?? []) console.log(`  검토 사항 ${printable(note)}`);
    console.log('');
  }

  console.log('사람이 확인할 것');
  console.log('  1. 장소 이름·주소·좌표가 원본 스냅샷과 같은가');
  console.log('  2. 홈페이지가 그 장소의 주소가 맞는가 (여러 URL이 붙어 있으면 비어 있어야 정상이다)');
  console.log('  3. 대표 이미지가 그 장소의 사진이 맞는가, 이용 조건과 출처를 확인했는가');
  console.log('  4. 분류(category)가 분류코드 근거와 맞는가 — 상호에 "카페"가 있다고 정하지 않는다');
  console.log('  5. 반려견 조건은 **제안**일 뿐이다. 원문과 대조해 관리자 화면에 직접 넣는다');
  console.log('     — 이 검토는 수집·변환 결과 확인이고, 실제 정책 확인(Verification)이 아니다');
  console.log('     — 같은 이름의 .review.md 가 원문↔제안 대조표다');
  console.log('');

  if (!args.confirm) {
    console.log('검토 결과를 기록하려면 --reviewer <식별자> --confirm 을 붙여 다시 실행하세요.');
    console.log('이 실행은 아무것도 바꾸지 않았습니다.');
    return;
  }
  const reviewer = (args.reviewer ?? '').trim();
  if (!reviewer) throw new ReviewError('--confirm 에는 --reviewer <식별자>가 필요합니다.');
  if (reviewer.length > 200 || /[\x00-\x1f\x7f]/.test(reviewer)) {
    throw new ReviewError('검토자 식별자에 제어문자가 들어 있거나 너무 깁니다.');
  }

  const reviewedAt = new Date().toISOString();
  const target = lib.reviewTargetHashes(loaded.importBytes, loaded.meta.items);
  const updated = {
    ...loaded.meta,
    review: { status: 'REVIEWED', reviewedBy: reviewer, reviewedAt, target },
  };
  try {
    await fs.writeFile(metaPath, JSON.stringify(updated, null, 2) + '\n', 'utf8');
  } catch (error) {
    throw new ReviewError(`검토 기록 저장 실패: ${errorDetail(error)}.`);
  }

  console.log(`검토 기록 완료: ${printable(reviewer)} · ${reviewedAt}`);
  console.log(`검토 대상 해시: ${target.importSha256.slice(0, 16)}… (등록용) / ${target.itemsSha256.slice(0, 16)}… (메타)`);
  console.log('해시는 내용이 그대로인지 확인하는 수단이며 검토자 신원을 인증하는 전자서명이 아닙니다.');
  console.log('데이터를 다시 변환하면 이 기록은 무효가 되고 다시 검토해야 합니다.');
  console.log('');
  console.log('다음 단계 (DB에 접속합니다):');
  console.log(`  dry-run: npm run import:places -- --file ${printable(importRecordPath)}`);
  console.log(`  실제 등록: npm run import:places -- --file ${printable(importRecordPath)} --commit`);
}

main().catch(error => {
  console.error(printable(error instanceof ReviewError ? error.message : errorDetail(error)));
  process.exitCode = 1;
});
