// export-tour-sample.cjs / collect-tour-area.cjs가 저장한 원본 스냅샷을
// 기존 후보 등록기의 입력 형식으로 바꾼다. **API를 호출하지 않는다.**
//
//   한 건:      node scripts/prepare-tour-import.cjs --file "data/tour-api/place-129438-....json"
//   여러 건:    node scripts/prepare-tour-import.cjs --dir "data/tour-api"
//   중복 허용:  node scripts/prepare-tour-import.cjs --dir "data/tour-api" --latest
//
// 결과는 **등록용 배열 1개 + 검토 메타데이터 1개**다. 항목마다 파일이 흩어지지 않는다.
// 두 파일은 같은 이름을 쓰며 항상 함께 보관한다 — 메타가 없으면 등록기가 거부한다.
const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');
const { pathToFileURL } = require('node:url');

class PrepareError extends Error {}

const TOOL_VERSION = 3;
const KOGL_LICENSE_URL = {
  Type1: 'https://www.kogl.or.kr/info/licenseType1.do',
};
/**
 * 공공누리 출처 표시에 들어가는 **기관 홈페이지 주소**.
 * API 응답에는 출처 링크가 없어서 기관의 대표 주소를 쓴다.
 * serviceKey가 들어간 요청 URL을 출처로 쓰지 않기 위한 값이기도 하다.
 */
const KTO_PROVIDER = '한국관광공사';
const KTO_HOMEPAGE = 'https://kto.visitkorea.or.kr';

const printable = value => String(value).replace(/[\x00-\x1f\x7f]/g, ' ');
const sha256 = value => createHash('sha256').update(value).digest('hex');

function errorDetail(error) {
  const code = /^[A-Z][A-Z0-9_]{0,63}$/.test(error?.code || '') ? error.code : null;
  const messages = {
    ENOENT: '파일 또는 폴더를 찾을 수 없습니다',
    EACCES: '파일 접근 권한이 없습니다',
    EPERM: '파일 작업 권한이 없거나 파일이 사용 중입니다',
    ENOSPC: '디스크 공간이 부족합니다',
    EEXIST: '같은 이름의 파일이 이미 있습니다',
    EISDIR: '파일 위치에 폴더가 있습니다',
    ENOTDIR: '경로 중 폴더여야 하는 항목이 파일입니다',
    ERR_MODULE_NOT_FOUND: '불러올 모듈 또는 의존성을 찾을 수 없습니다',
    MODULE_NOT_FOUND: '불러올 모듈 또는 의존성을 찾을 수 없습니다',
  };
  if (code) return `${messages[code] || '처리 중 오류가 발생했습니다'} (${code})`;
  if (error instanceof SyntaxError) return '문법이 올바르지 않습니다 (SyntaxError)';
  const name = /^[A-Za-z][A-Za-z0-9]{0,39}$/.test(error?.name || '') ? error.name : 'Error';
  // 예외 메시지 전체에는 경로·입력값·접속정보가 포함될 수 있어 종류와 코드만 표시합니다.
  return `처리 중 오류가 발생했습니다 (${name})`;
}

function requireTimestamp(value, label) {
  if (typeof value !== 'string' || !value.trim() || !Number.isFinite(Date.parse(value))) {
    throw new PrepareError(`${label}이 없거나 유효하지 않습니다. 원본 스냅샷을 확인하세요.`);
  }
  return value;
}

/**
 * 새 파일로만 만든다. 이미 있으면 `wx`가 실패하므로 기존 파일을 덮어쓰지 않는다.
 *
 * 두 파일을 순서대로 쓰고 실패 시 정리하는 방식이라 **강제 종료까지 견디는 원자적
 * 트랜잭션은 아니다.** 전원이 꺼지면 한쪽만 남을 수 있다. 그 상태는 등록 전 검사가
 * "메타 없음"·"해시 불일치"로 막는다.
 */
async function writeNew(filePath, contents, createdFiles) {
  const handle = await fs.open(filePath, 'wx');
  createdFiles.push(filePath);
  try {
    await handle.writeFile(contents, 'utf8');
  } finally {
    await handle.close();
  }
}

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function readItems(snapshot, endpoint) {
  const response = snapshot.responses?.[endpoint]?.data?.response;
  if (response?.header?.resultCode !== '0000') {
    throw new PrepareError(`${endpoint}: 정상 조회 응답이 없는 파일입니다.`);
  }
  const body = response.body;
  const value = body?.items?.item;
  const items = value == null || value === '' ? [] : Array.isArray(value) ? value : [value];
  const count = body?.totalCount;
  const total = Number(count);
  if (count == null || String(count).trim() === '' || !Number.isSafeInteger(total) || total !== items.length) {
    throw new PrepareError(`${endpoint}: 결과 건수와 항목이 일치하지 않습니다.`);
  }
  for (const item of items) {
    if (!item || typeof item !== 'object' || String(item.contentid) !== snapshot.contentId) {
      throw new PrepareError(`${endpoint}: 원본의 콘텐츠 ID가 일치하지 않습니다.`);
    }
    if (item.contenttypeid != null && String(item.contenttypeid) !== snapshot.contentTypeId) {
      throw new PrepareError(`${endpoint}: 원본의 관광타입이 일치하지 않습니다.`);
    }
  }
  return items;
}

/** 스냅샷 1건 → 후보 1건 + 메타 항목 1건. 파일을 쓰지 않는 순수 변환이다. */
function convertSnapshot(snapshot, sourceBytes, snapshotRecordPath, isHttpUrl, lib, codes) {
  if (
    snapshot?.formatVersion !== 1 ||
    snapshot.source?.service !== 'KorPetTourService2' ||
    typeof snapshot.contentId !== 'string' ||
    !/^\d+$/.test(snapshot.contentId)
  ) {
    throw new PrepareError('수집 스크립트로 저장한 원본 JSON을 지정하세요.');
  }
  const fetchedAt = requireTimestamp(snapshot.fetchedAt, '수집 시각(fetchedAt)');
  if (typeof snapshot.reviewStatus !== 'string' || !snapshot.reviewStatus.trim()) {
    throw new PrepareError('원본에 reviewStatus가 없습니다. 원본 스냅샷을 확인하세요.');
  }
  const commonItems = readItems(snapshot, 'detailCommon2');
  const introItems = readItems(snapshot, 'detailIntro2');
  const petItems = readItems(snapshot, 'detailPetTour2');
  if (commonItems.length !== 1) throw new PrepareError('장소 기본 정보가 정확히 1건이어야 합니다.');
  const common = commonItems[0];

  // 분류는 관광타입 + 분류체계 코드로 정한다. 상호에 "카페"가 들어간다는 이유로 정하지 않는다.
  const classification = lib.classifyContent({
    contentTypeId: snapshot.contentTypeId,
    lclsSystm1: common.lclsSystm1,
    lclsSystm2: common.lclsSystm2,
    lclsSystm3: common.lclsSystm3,
  });
  // 규칙이 기대지 않는 분류의 명칭은 코드표 캐시에서 채운다. 캐시가 없으면 null로 둔다 —
  // 명칭을 지어내지 않는다.
  for (const level of ['1', '2']) {
    const nameKey = `lclsSystm${level}Name`;
    const code = classification.evidence[`lclsSystm${level}`];
    if (!classification.evidence[nameKey] && code) {
      classification.evidence[nameKey] = codes?.lclsSystm?.[`level${level}`]?.[code] ?? null;
    }
  }
  const category = classification.category;
  if (!category) throw new PrepareError(`분류 검토 대상입니다 — ${classification.reason}`);

  const intro = introItems[0] ?? {};
  const pet = petItems[0] ?? {};
  const petPolicy = lib.buildPetPolicyReview(pet);
  if (petPolicy.blocked) {
    throw new PrepareError(`동반 불가 — ${petPolicy.blocked.reason} (${petPolicy.blocked.quote})`);
  }
  const introFields =
    lib.INTRO_FIELDS_BY_CONTENT_TYPE[snapshot.contentTypeId] ??
    lib.INTRO_FIELDS_BY_CONTENT_TYPE[12];
  const operatingHours = lib.buildOperatingHoursReview(intro, introFields);
  const parking = lib.buildParkingReview(intro, introFields);
  const description = lib.buildDescriptionReview(common);
  const usageGuide = lib.buildUsageGuide(intro, introFields, operatingHours.proposal);

  const latitude = text(common.mapy);
  const longitude = text(common.mapx);
  if (!latitude || !longitude) throw new PrepareError('원본에 좌표가 없어 후보 데이터를 만들 수 없습니다.');

  // mapy=위도, mapx=경도. Place.location은 POINT(lng lat)이라 뒤집으면 엉뚱한 곳으로 간다.
  const candidate = {
    tourApiId: snapshot.contentId,
    nameKr: text(common.title),
    category,
    address: [text(common.addr1), text(common.addr2)].filter(Boolean).join(' '),
    lat: Number(latitude),
    lng: Number(longitude),
  };
  const notes = [];
  // `tel`은 지금까지 확인한 응답에서 전부 비어 있었다. 음식점은 문의처(infocenterfood)가
  // 유일한 연락처인데 안내 문구가 섞이기도 해서 **번호 하나만 있을 때만** 후보에 넣는다.
  const inquiryText = text(intro?.[introFields.inquiry]);
  const phone = text(common.tel) || lib.phoneFromInquiry(inquiryText);
  if (phone) candidate.phone = phone;
  else if (inquiryText) {
    notes.push(`문의처(${introFields.inquiry}): "${inquiryText}" — 번호가 하나로 떨어지지 않아 후보 입력에서 제외했습니다.`);
  }

  // **원본 정보를 후보에 싣는다.** 사람이 14곳의 원문을 다시 옮겨 적지 않아도 되도록.
  // 언어는 나눠 둔다 — 한국어 원문을 영어 칸에 넣지 않는다(descriptionEn은 비운다).
  if (description.raw) candidate.descriptionKr = description.raw;
  if (usageGuide.guide) candidate.usageGuideKr = usageGuide.guide;
  // 주차는 분류값이 또렷할 때만 넣는다. 아니면 UNKNOWN(확인되지 않음)으로 남는다.
  if (parking.proposal) candidate.parking = parking.proposal.parking;
  if (operatingHours.proposal) {
    candidate.hours = operatingHours.proposal.hours;
    // hoursNote는 화면에 그대로 나가는 영어 칸이다. 한국어 원문을 넣지 않는다.
  }
  function addUrl(field, rawValue, label) {
    const value = text(rawValue);
    if (!value) return false;
    // HTML 또는 여러 URL이 합쳐진 값은 하나를 임의로 선택하지 않습니다.
    if ((value.match(/https?:\/\//gi) || []).length !== 1 || /[<>\s]/.test(value) || !isHttpUrl(value)) {
      notes.push(`${label}: 단일 http/https 주소로 확인할 수 없어 후보 입력에서 제외했습니다. 원본 JSON에서 검토하세요.`);
      return false;
    }
    const url = new URL(value);
    if (url.username || url.password) {
      notes.push(`${label}: 사용자 정보가 포함된 URL이어서 후보 입력에서 제외했습니다.`);
      return false;
    }
    candidate[field] = value;
    return true;
  }
  addUrl('website', common.homepage, '홈페이지');

  const copyrightCode = text(common.cpyrhtDivCd);
  let selectedImageField = null;
  // Type1만 자동 선택하는 프로젝트 기준입니다. 다른 유형의 이용을 일괄 금지한다는 뜻이 아닙니다.
  // 원본(firstimage)을 먼저 쓰고, 쓸 수 없을 때만 썸네일(firstimage2)로 내려갑니다.
  if (copyrightCode === 'Type1') {
    for (const field of ['firstimage', 'firstimage2']) {
      if (addUrl('thumbnailUrl', common[field], `대표 이미지(${field})`)) {
        selectedImageField = field;
        break;
      }
    }
  } else if (text(common.firstimage) || text(common.firstimage2)) {
    notes.push(`대표 이미지: 저작권 유형(${copyrightCode || '미제공'})을 수동 검토하도록 이미지 입력을 제외했습니다.`);
  }

  // 공공누리는 기관명·작성연도·저작물명·작성자·기관 홈페이지 주소를 요구한다.
  // API가 주는 것은 기관과 유형뿐이라 **나머지는 NULL로 둔다.** 장소 이름을 저작물명으로,
  // 수집 연도를 작성연도로 대신 채우지 않는다. 비어 있는 항목은 사람이 확인해 채운다.
  const image = selectedImageField
    ? {
        cpyrhtDivCd: copyrightCode,
        selectionPolicy: 'AUTO_SELECT_TYPE1_ONLY',
        selectedField: selectedImageField,
        imageUrl: candidate.thumbnailUrl,
        licenseType: 'KOGL_TYPE1',
        licenseUrl: KOGL_LICENSE_URL.Type1,
        provider: KTO_PROVIDER,
        sourceUrl: KTO_HOMEPAGE,
        copyrightHolder: null,
        workTitle: null,
        createdYear: null,
        /** 공공누리가 요구하는 항목 중 비어 있는 것. 사람이 채우기 전까지 공개되지 않는다. */
        missingAttributionFields: ['copyrightHolder', 'workTitle', 'createdYear'],
      }
    : {
        cpyrhtDivCd: copyrightCode || null,
        selectionPolicy: 'AUTO_SELECT_TYPE1_ONLY',
        selectedField: null,
        imageUrl: null,
      };
  if (selectedImageField) {
    notes.push('대표 이미지: 공공누리 출처 표시 항목(저작권자·저작물명·작성연도)이 비어 있습니다. 관리자 화면에서 확인해 채운 뒤 검토 체크를 저장해야 공개 화면에 나갑니다.');
  }

  // 운영 정보·반려견 조건은 **제안일 뿐 저장값이 아니다.** 관리자 화면에서 사람이
  // 원문과 대조해 확정한다. 여기서 만드는 것은 그 대조표다.
  for (const proposal of petPolicy.proposals) {
    notes.push(`반려견 조건 제안: ${proposal.target} = ${proposal.value} ← "${proposal.quote}"`);
  }
  for (const conflict of petPolicy.conflicts) {
    notes.push(`반려견 조건 충돌: ${conflict.reason}`);
  }
  if (petPolicy.unresolved.length > 0) {
    notes.push(`반려견 조건 미확인 ${petPolicy.unresolved.length}건 — 검토 시트에서 확인하세요.`);
  }
  notes.push(
    operatingHours.proposal
      ? `운영시간 제안: ${operatingHours.proposal.basis}`
      : `운영시간 제안 없음: ${operatingHours.reason}`,
  );
  notes.push(
    parking.proposal
      ? `주차 제안: Place.parking = ${parking.proposal.parking} ← ${parking.proposal.basis}`
      : `주차 제안 없음: ${parking.reason}`,
  );
  if (description.proposal) {
    notes.push(
      `장소 소개 ${description.proposal.lengthChars}자를 descriptionKr로 가져옵니다(한국어 원문). 영어 화면에서는 한국어임을 밝히고 보여 줍니다. 영문 소개는 비워 둡니다.`,
    );
  }
  notes.push(
    usageGuide.guide
      ? `운영·이용 안내 원문 ${usageGuide.guide.length}자를 usageGuideKr로 가져옵니다. 계절별·시설별 범위를 지우지 않았습니다.`
      : `운영·이용 안내 없음: ${usageGuide.reason}`,
  );

  const metaItem = {
    tourApiId: candidate.tourApiId,
    nameKr: candidate.nameKr,
    category,
    classification: {
      rule: classification.rule,
      reason: classification.reason,
      evidence: classification.evidence,
    },
    // 수집일·콘텐츠 수정일·사람이 확인한 날은 서로 다른 값이다. 마지막 것은 여기에 없다.
    contentModifiedAt: text(common.modifiedtime) || null,
    petPolicy,
    operatingHours,
    parking,
    description,
    usageGuide,
    introRaw: Object.fromEntries(
      [...Object.values(introFields), ...lib.FOOD_INTRO_EXTRA_FIELDS]
        .filter((field, index, list) => list.indexOf(field) === index)
        .map(field => [field, text(intro?.[field])])
        .filter(([, value]) => value !== ''),
    ),
    source: {
      kind: 'TOUR_API',
      provider: text(snapshot.source.provider) || null,
      service: snapshot.source.service,
      snapshotFile: snapshotRecordPath,
      sha256: sha256(sourceBytes),
      contentId: snapshot.contentId,
      contentTypeId: snapshot.contentTypeId,
      fetchedAt,
      reviewStatus: snapshot.reviewStatus,
      responseFetchedAt: Object.fromEntries(
        ['detailCommon2', 'detailIntro2', 'detailPetTour2'].map(endpoint => [
          endpoint,
          snapshot.responses[endpoint].fetchedAt == null
            ? null
            : requireTimestamp(snapshot.responses[endpoint].fetchedAt, `${endpoint} 수집 시각`),
        ]),
      ),
    },
    image,
    notes,
  };
  return { candidate, metaItem };
}

/**
 * 관리자 화면 옆에 놓고 보는 대조표.
 *
 * **원문 → 제안 값 → 근거 → 미확인** 네 칸을 그대로 옮긴다. 제안 값은 저장값이 아니다 —
 * 사람이 원문과 대조해 관리자 폼에 직접 넣고, 그때서야 공개 조건 필터가 읽는 값이 된다.
 */
function buildReviewSheet(metadata, candidates) {
  const candidateById = new Map(candidates.map(item => [item.tourApiId, item]));
  const lines = [
    '# TourAPI 가져오기 검토 시트',
    '',
    `- 변환 시각: ${metadata.preparedAt}`,
    `- 등록용 파일: \`${metadata.output.importFile}\` (${metadata.output.itemCount}건)`,
    '- **이 시트는 제안일 뿐 저장값이 아니다.** 사람이 관리자 화면에서 확인해 넣어야 조건 필터가 읽는다.',
    '- 수집일 ≠ 콘텐츠 수정일 ≠ 정책 확인일. 이 시트에는 앞의 둘만 있다.',
    '',
  ];
  for (const item of metadata.items) {
    const candidate = candidateById.get(item.tourApiId);
    lines.push(`## ${item.nameKr} (contentId ${item.tourApiId})`);
    lines.push('');
    lines.push(`- 분류: **${item.category}** — ${item.classification?.reason ?? ''}`);
    lines.push(
      `- 분류 근거 코드: contentTypeId=${item.classification?.evidence?.contentTypeId}` +
        `(${item.classification?.evidence?.contentTypeName ?? '?'}) · ` +
        `${item.classification?.evidence?.lclsSystm2}(${item.classification?.evidence?.lclsSystm2Name ?? '?'})` +
        ` / ${item.classification?.evidence?.lclsSystm3}(${item.classification?.evidence?.lclsSystm3Name ?? '?'})`,
    );
    lines.push(`- 주소: ${candidate?.address ?? ''}`);
    lines.push(`- 좌표: 위도 ${candidate?.lat} / 경도 ${candidate?.lng}`);
    lines.push(`- 전화: ${candidate?.phone ?? '(후보에 넣지 않음)'}`);
    lines.push(`- 수집 시각: ${item.source?.fetchedAt} · 콘텐츠 수정일: ${item.contentModifiedAt ?? '미제공'}`);
    lines.push(`- 이미지: ${item.image?.imageUrl ?? '없음'} (cpyrhtDivCd=${item.image?.cpyrhtDivCd ?? '미제공'})`);
    lines.push('');

    lines.push('### 반려견 동반 원문');
    lines.push('');
    lines.push('| 원문 필드 | 값 |');
    lines.push('|---|---|');
    for (const [field, value] of Object.entries(item.petPolicy?.raw ?? {})) {
      lines.push(`| \`${field}\` | ${value ? escapeCell(value) : '_(미제공 — 제한 없음이 아니다)_'} |`);
    }
    lines.push('');

    lines.push('### 제안 값 (사람이 확인한 뒤 관리자 폼에 넣는다)');
    lines.push('');
    if ((item.petPolicy?.proposals ?? []).length === 0 && !item.operatingHours?.proposal) {
      lines.push('_제안할 수 있는 값이 없다. 원문만으로는 확정되지 않는다._');
    } else {
      lines.push('| 대상 | 제안 값 | 근거 원문 |');
      lines.push('|---|---|---|');
      for (const proposal of item.petPolicy?.proposals ?? []) {
        lines.push(`| ${proposal.target} | \`${proposal.value}\` | ${escapeCell(proposal.quote)} |`);
        if (proposal.policyDetails) {
          lines.push(
            `| policyDetails.${proposal.policyDetails.path} | \`${escapeCell(JSON.stringify(proposal.policyDetails.value))}\` | 위와 같음 |`,
          );
        }
      }
      if (item.parking?.proposal) {
        lines.push(
          `| Place.parking | \`${item.parking.proposal.parking}\` | ${escapeCell(item.parking.raw)} |`,
        );
        if (item.parking.proposal.parkingNoteSource) {
          lines.push(
            `| Place.parkingNote | _(한국어 원문 "${escapeCell(item.parking.proposal.parkingNoteSource)}" — 화면에 그대로 나가는 칸이라 영어로 옮겨 넣으세요)_ | 위와 같음 |`,
          );
        }
      }
      if (item.description?.proposal) {
        lines.push(
          `| Place.descriptionKr | _(아래 원문 ${item.description.proposal.lengthChars}자 — **가져오기가 저장하지 않는다**)_ | ${escapeCell(item.description.proposal.basis)} |`,
        );
      }
      if (item.operatingHours?.proposal) {
        const hours = item.operatingHours.proposal.hours;
        const summary = Object.entries(hours)
          .map(([day, value]) => `${day} ${value ? `${value.open}~${value.close}` : '휴무'}`)
          .join(', ');
        lines.push(`| Place.hours | ${escapeCell(summary)} | ${escapeCell(item.operatingHours.proposal.basis)} |`);
        if (item.operatingHours.proposal.hoursNote) {
          lines.push(`| Place.hoursNote | ${escapeCell(item.operatingHours.proposal.hoursNote)} | 위와 같음 |`);
        }
      }
    }
    lines.push('');

    lines.push('### 미확인·충돌 (policyDetails.uncertainties 후보)');
    lines.push('');
    if (!item.operatingHours?.proposal) {
      lines.push(`- 운영시간: 제안 없음 — ${escapeCell(item.operatingHours?.reason ?? '')}`);
      lines.push(`  - 원문: ${escapeCell(Object.values(item.operatingHours?.raw ?? {})[0] ?? '')}`);
    }
    if (!item.parking?.proposal) {
      lines.push(`- 주차: 제안 없음 — ${escapeCell(item.parking?.reason ?? '')}`);
    }
    for (const conflict of item.petPolicy?.conflicts ?? []) {
      lines.push(`- **충돌** ${conflict.reason}`);
    }
    if ((item.petPolicy?.unresolved ?? []).length === 0) {
      lines.push('- 그 밖에 남은 항목 없음');
    } else {
      lines.push('');
      lines.push('| target | 근거 원문 | 확인할 것 |');
      lines.push('|---|---|---|');
      for (const entry of item.petPolicy.unresolved) {
        lines.push(
          `| ${entry.target} | ${entry.quote ? escapeCell(entry.quote) : `_(${entry.field} 미제공)_`} | ${escapeCell(entry.reason)}${entry.question ? ` / 질문: ${escapeCell(entry.question)}` : ''} |`,
        );
      }
    }
    lines.push('');

    if (Object.keys(item.introRaw ?? {}).length > 0) {
      lines.push('### 운영 정보 원문 (해당 관광타입의 실제 필드)');
      lines.push('');
      for (const [field, value] of Object.entries(item.introRaw)) {
        lines.push(`- \`${field}\`: ${escapeCell(value)}`);
      }
      lines.push('');
    }
    if (item.description?.raw) {
      lines.push('### 장소 소개 원문 (한국어) — 가져오기가 저장하지 않는다');
      lines.push('');
      lines.push('```');
      lines.push(item.description.raw);
      lines.push('```');
      lines.push('');
    }
    for (const note of item.notes ?? []) lines.push(`> ${escapeCell(note)}`);
    lines.push('');
  }
  return lines.join('\n') + '\n';
}

function escapeCell(value) {
  return String(value).replace(/[\r\n]+/g, ' ').replace(/\|/g, '\\|');
}

function parseArgs(argv) {
  const files = [];
  let dir = null;
  let latest = false;
  let rebuildSheet = null;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--rebuild-sheet') {
      rebuildSheet = argv[i + 1];
      if (!rebuildSheet) throw new PrepareError('--rebuild-sheet 뒤에 등록용 JSON 경로가 필요합니다.');
      i += 1;
    } else if (argv[i] === '--file') {
      const value = argv[i + 1];
      if (!value) throw new PrepareError('--file 뒤에 경로가 필요합니다.');
      files.push(value);
      i += 1;
    } else if (argv[i] === '--dir') {
      dir = argv[i + 1];
      if (!dir) throw new PrepareError('--dir 뒤에 경로가 필요합니다.');
      i += 1;
    } else if (argv[i] === '--latest') {
      latest = true;
    } else {
      throw new PrepareError(`알 수 없는 옵션입니다: ${printable(argv[i])}`);
    }
  }
  if (rebuildSheet) {
    if (files.length > 0 || dir) {
      throw new PrepareError('--rebuild-sheet 는 다른 입력 옵션과 함께 쓸 수 없습니다.');
    }
    return { files, dir, latest, rebuildSheet };
  }
  if (files.length === 0 && !dir) {
    throw new PrepareError(
      '사용법: node scripts/prepare-tour-import.cjs (--file "원본 JSON" | --dir "폴더") [--latest]\n' +
        '        node scripts/prepare-tour-import.cjs --rebuild-sheet "등록용 JSON"  (검토 시트만 다시 만든다)',
    );
  }
  return { files, dir, latest, rebuildSheet };
}

/**
 * 검토 시트만 다시 만든다. **등록용 배열과 메타는 건드리지 않는다.**
 *
 * 왜 따로 두나 — 배열·메타를 다시 만들면 해시가 달라져 이미 기록된 사람 검토가 무효가 되고
 * (D-23), 등록이 끝난 파일의 감사 기록이 끊긴다. 사람이 읽는 시트만 고쳐야 할 때가 있다.
 * 예: 2026-09-20 문의처 안내 문구가 잘못 붙던 버그.
 *
 * 시트는 **지금 규칙으로 다시 계산한 값**을 담는다. 원본 스냅샷에서 다시 읽으므로
 * 변환 규칙이 그동안 바뀌었다면 메타에 적힌 옛 `notes`와 다를 수 있다. 그 사실을 시트에 적는다.
 */
async function rebuildSheet(importPath, projectRoot, record, lib, isHttpUrl, codes) {
  const meta = await import(
    pathToFileURL(path.join(projectRoot, 'scripts', 'tour-import-meta.mjs')).href
  );
  const loaded = await meta.loadReviewedImport(importPath, projectRoot);
  if (loaded.issues.length > 0) {
    for (const issue of loaded.issues) console.error(`  - ${printable(issue)}`);
    throw new PrepareError('메타와 등록용 배열이 맞지 않습니다. 시트를 다시 만들지 않았습니다.');
  }

  const items = [];
  const missing = [];
  for (const metaItem of loaded.meta.items) {
    const snapshotPath = metaItem.source?.snapshotFile;
    if (!snapshotPath) {
      missing.push(`${metaItem.tourApiId}: 원본 스냅샷 경로가 메타에 없습니다.`);
      items.push(metaItem);
      continue;
    }
    let bytes;
    try {
      bytes = await fs.readFile(path.resolve(projectRoot, snapshotPath));
    } catch {
      missing.push(`${metaItem.tourApiId}: 원본 스냅샷을 찾지 못했습니다 (${snapshotPath}).`);
      items.push(metaItem);
      continue;
    }
    const snapshot = JSON.parse(bytes.toString('utf8').replace(/^﻿/, ''));
    const fresh = convertSnapshot(snapshot, bytes, snapshotPath, isHttpUrl, lib, codes);
    // 식별 정보는 메타의 것을 그대로 두고, 사람이 읽을 부분만 새로 계산한 값으로 바꾼다.
    items.push({ ...metaItem, ...fresh.metaItem, source: metaItem.source, image: metaItem.image });
  }

  const sheetPath = importPath.replace(/\.json$/i, '.review.md');
  const contents = buildReviewSheet({ ...loaded.meta, items }, loaded.items);
  const header =
    `> 이 시트는 ${new Date().toISOString()}에 **현재 변환 규칙으로 다시 만들었다.**\n` +
    '> 등록용 배열과 메타는 바꾸지 않았다 — 기록된 사람 검토와 해시는 그대로다.\n' +
    '> 메타의 옛 `notes`와 다를 수 있고, 이 시트 쪽이 최신이다.\n\n';
  await fs.writeFile(sheetPath, header + contents, 'utf8');

  console.log(`검토 시트를 다시 만들었습니다: ${printable(record(sheetPath))} · ${items.length}건`);
  console.log('등록용 배열과 메타는 건드리지 않았습니다 (검토 해시 유지).');
  for (const line of missing) console.error(`  원본 없음: ${printable(line)}`);
  if (missing.length > 0) process.exitCode = 1;
}

async function main() {
  const { files, dir, latest, rebuildSheet: rebuildTarget } = parseArgs(process.argv.slice(2));
  const projectRoot = path.resolve(__dirname, '..');
  const record = filePath => path.relative(projectRoot, filePath).split(path.sep).join('/');

  // 코드표 캐시와 변환 규칙은 두 경로가 함께 쓴다.
  let codesCache = null;
  try {
    codesCache = JSON.parse(
      await fs.readFile(path.join(projectRoot, 'data', 'tour-api', 'codes.json'), 'utf8'),
    );
  } catch {
    codesCache = null;
  }
  let sharedValidate, sharedIsHttpUrl, sharedLib;
  try {
    ({ validate: sharedValidate, isHttpUrl: sharedIsHttpUrl } = await import(
      pathToFileURL(path.join(projectRoot, 'scripts', 'import-places.mjs')).href
    ));
    const [classification, petPolicy] = await Promise.all([
      import(pathToFileURL(path.join(projectRoot, 'scripts', 'tour-classification.mjs')).href),
      import(pathToFileURL(path.join(projectRoot, 'scripts', 'tour-pet-policy.mjs')).href),
    ]);
    sharedLib = { ...classification, ...petPolicy };
  } catch (error) {
    throw new PrepareError(`기존 scripts/import-places.mjs 불러오기 실패: ${errorDetail(error)}.`);
  }

  if (rebuildTarget) {
    await rebuildSheet(
      path.resolve(projectRoot, rebuildTarget),
      projectRoot,
      record,
      sharedLib,
      sharedIsHttpUrl,
      codesCache,
    );
    return;
  }

  const inputPaths = files.map(file => path.resolve(projectRoot, file));
  if (dir) {
    const dirPath = path.resolve(projectRoot, dir);
    let entries;
    try {
      entries = await fs.readdir(dirPath);
    } catch (error) {
      throw new PrepareError(`폴더를 읽지 못했습니다: ${errorDetail(error)}.`);
    }
    // 변환 결과(import-*.json)와 메타는 입력이 아니다. 원본 스냅샷만 고른다.
    for (const entry of entries.sort()) {
      if (/^place-\d+-.*\.json$/i.test(entry)) inputPaths.push(path.join(dirPath, entry));
    }
  }
  if (inputPaths.length === 0) {
    throw new PrepareError('변환할 원본 스냅샷을 찾지 못했습니다. 파일 이름은 place-<콘텐츠ID>-....json 입니다.');
  }

  const codes = codesCache;
  const validate = sharedValidate;
  const isHttpUrl = sharedIsHttpUrl;
  const lib = sharedLib;
  if (typeof validate !== 'function' || typeof isHttpUrl !== 'function') {
    throw new PrepareError('기존 등록 스크립트에서 validate/isHttpUrl 함수를 찾지 못했습니다.');
  }

  // 같은 콘텐츠 ID의 스냅샷이 여러 개면 조용히 하나를 고르지 않는다.
  const converted = new Map();
  const failures = [];
  const conflicts = [];
  const skipped = [];

  for (const inputPath of inputPaths.sort()) {
    const shown = record(inputPath);
    let sourceBytes;
    try {
      sourceBytes = await fs.readFile(inputPath);
    } catch (error) {
      failures.push(`${shown}: 읽기 실패 — ${errorDetail(error)}`);
      continue;
    }
    let snapshot;
    try {
      snapshot = JSON.parse(sourceBytes.toString('utf8').replace(/^﻿/, ''));
    } catch (error) {
      failures.push(`${shown}: JSON 해석 실패 — ${errorDetail(error)}`);
      continue;
    }

    let result;
    try {
      result = convertSnapshot(snapshot, sourceBytes, shown, isHttpUrl, lib, codes);
    } catch (error) {
      if (!(error instanceof PrepareError)) throw error;
      // 분류가 정해지지 않은 곳과 동반 불가인 곳은 "제외"이고 오류가 아니다.
      const bucket = /분류 검토 대상입니다|동반 불가/.test(error.message) ? skipped : failures;
      bucket.push(`${shown}: ${error.message}`);
      continue;
    }

    const reason = validate(result.candidate, converted.size);
    if (reason) {
      failures.push(`${shown}: 후보 입력 검증 실패 — ${reason}`);
      continue;
    }

    const id = result.candidate.tourApiId;
    const existing = converted.get(id);
    if (!existing) {
      converted.set(id, { ...result, snapshotPath: shown });
      continue;
    }
    if (!latest) {
      conflicts.push(
        `${id}: 스냅샷이 둘 이상입니다 (${existing.snapshotPath} / ${shown}). ` +
          '하나만 남기거나 --latest 로 수집 시각이 가장 늦은 것을 고르세요.',
      );
      continue;
    }
    const newer =
      Date.parse(result.metaItem.source.fetchedAt) > Date.parse(existing.metaItem.source.fetchedAt);
    if (newer) converted.set(id, { ...result, snapshotPath: shown });
  }

  if (conflicts.length > 0) {
    for (const line of conflicts) console.error(`중복: ${printable(line)}`);
    throw new PrepareError('같은 콘텐츠 ID의 스냅샷이 겹칩니다. 위 내용을 정리한 뒤 다시 실행하세요.');
  }
  if (converted.size === 0) {
    for (const line of [...skipped, ...failures]) console.error(`  - ${printable(line)}`);
    throw new PrepareError('변환된 장소가 없습니다.');
  }

  const entries = [...converted.values()];
  const candidates = entries.map(entry => entry.candidate);
  const metaItems = entries.map(entry => entry.metaItem);

  const outputDir = path.join(projectRoot, 'data', 'tour-api');
  const preparedAt = new Date().toISOString();
  const timestamp = preparedAt.replace(/[:.]/g, '-');
  const preparationId = randomUUID();
  // 파일 이름에 UUID를 넣어 충돌 가능성을 매우 낮춘다. 0으로 만들지는 못하므로
  // 실제 방어는 아래 `wx` 플래그가 한다.
  const baseName = `import-${timestamp}-${preparationId}`;
  const outputPath = path.join(outputDir, `${baseName}.json`);
  const metadataPath = path.join(outputDir, `${baseName}.meta.json`);
  const sheetPath = path.join(outputDir, `${baseName}.review.md`);
  const importContents = JSON.stringify(candidates, null, 2) + '\n';

  const metadata = {
    formatVersion: 2,
    preparationId,
    tool: { name: 'prepare-tour-import.cjs', version: TOOL_VERSION },
    preparedAt,
    output: {
      importFile: record(outputPath),
      sha256: sha256(importContents),
      itemCount: candidates.length,
      tourApiIds: candidates.map(item => item.tourApiId),
    },
    items: metaItems,
    // 파일 변환은 사람의 검토가 아니다. 원본의 reviewStatus도 승계하지 않는다.
    // 등록기는 이 값이 REVIEWED가 아니면 DB에 붙기 전에 거부한다.
    review: {
      status: 'UNREVIEWED',
      reviewedBy: null,
      reviewedAt: null,
      target: { importSha256: null, itemsSha256: null },
    },
  };

  const createdFiles = [];
  try {
    await fs.mkdir(outputDir, { recursive: true });
    // 출처 기록을 먼저 저장한다. 실패하면 이번 실행에서 만든 파일만 지운다.
    await writeNew(metadataPath, JSON.stringify(metadata, null, 2) + '\n', createdFiles);
    await writeNew(outputPath, importContents, createdFiles);
    // 검토 시트는 메타를 사람이 읽을 수 있게 옮긴 것이다. 등록기는 이 파일을 읽지 않는다.
    await writeNew(sheetPath, buildReviewSheet(metadata, candidates), createdFiles);
  } catch (error) {
    const leftovers = [];
    for (const filePath of createdFiles.reverse()) {
      try {
        await fs.unlink(filePath);
      } catch (cleanupError) {
        if (cleanupError?.code !== 'ENOENT') leftovers.push(record(filePath));
      }
    }
    const cleanupNote = leftovers.length ? ` 정리하지 못한 파일: ${leftovers.join(', ')}.` : '';
    throw new PrepareError(`변환 파일 저장 실패: ${errorDetail(error)}.${cleanupNote}`);
  }

  console.log(`변환 ${candidates.length}건 · 제외 ${skipped.length}건 · 실패 ${failures.length}건`);
  for (const entry of entries) {
    console.log(`  · ${printable(entry.candidate.nameKr)} (${entry.candidate.tourApiId}) ← ${printable(entry.snapshotPath)}`);
  }
  for (const line of skipped) console.log(`제외: ${printable(line)}`);
  for (const line of failures) console.error(`실패: ${printable(line)}`);
  console.log('');
  console.log(`등록용 파일: ${printable(record(outputPath))}`);
  console.log(`출처·검토 기록: ${printable(record(metadataPath))}`);
  console.log(`검토 시트(원문↔제안 대조표): ${printable(record(sheetPath))}`);
  console.log('검토 상태: UNREVIEWED (사람 검토 전)');
  for (const item of metaItems) {
    for (const note of item.notes) console.log(`검토 사항 [${item.tourApiId}]: ${printable(note)}`);
  }
  console.log('');
  console.log('다음 단계:');
  console.log(`  1) 형식 확인 (DB·API 접속 없음): npm run import:places -- --file ${record(outputPath)} --validate-only`);
  console.log(`  2) 사람 검토:                    node scripts/review-tour-import.cjs --file ${record(outputPath)} --reviewer <이메일> --confirm`);
  console.log('운영 정보와 반려동물 동반 조건은 원본 JSON에 보존되어 있습니다. 자동으로 옮기지 않았습니다.');
  console.log('이 단계에서는 DB에 접속하거나 장소를 등록하지 않았습니다.');
  if (failures.length > 0) process.exitCode = 1;
}

/**
 * 변환 규칙을 테스트가 직접 부를 수 있게 내보낸다.
 * `import-places.mjs`와 같은 이유다 — 규칙을 테스트에 옮겨 적으면 두 곳이 갈라진다.
 */
module.exports = { convertSnapshot, buildReviewSheet, PrepareError };

// 직접 실행했을 때만 돈다. 테스트가 import만 해도 CLI가 돌아가면 안 된다.
if (require.main === module) {
  main().catch(error => {
    console.error(printable(error instanceof PrepareError ? error.message : `변환 실패: ${errorDetail(error)}.`));
    process.exitCode = 1;
  });
}
