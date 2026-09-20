// 지역 목록으로 대상을 정해 원본 스냅샷을 모은다 (한국관광공사 반려동물 동반여행).
//
//   건수만 확인:  node scripts/collect-tour-area.cjs --region 30 --content-type 12 --list-only
//   수집:         node scripts/collect-tour-area.cjs --region 30 --content-type 12
//   일부만:       node scripts/collect-tour-area.cjs --region 30 --content-type 12 --limit 5
//   분류 분포:    node scripts/collect-tour-area.cjs --region 30 --list-only --summary
//   카페만:       node scripts/collect-tour-area.cjs --region 30 --content-type 39 --lcls2 FD05
//   콘텐츠 지정:  node scripts/collect-tour-area.cjs --content-id 3443019 --content-id 2951541
//   코드표 캐시:  node scripts/collect-tour-area.cjs --refresh-codes --region 30
//
// `--region`은 **법정동 시도코드**(lDongRegnCd)다. 대전은 30이고 행정구역 경계로 자른다 —
// 대전시청 반경 몇 km가 아니다. 위치 기반 조회(locationBasedList2)의 반경 최대치는
// 20km라서 서비스 범위(50km)를 반경 파라미터 하나로 대신할 수 없다.
//
// 저장 형식은 export-tour-sample.cjs와 같다(formatVersion 1). 그래서
// prepare-tour-import.cjs가 두 경로의 결과를 똑같이 변환한다.
//
// **이미 스냅샷이 있는 콘텐츠는 건너뛴다.** 수집과 변환을 나눈 이유가 이것이다 —
// 변환 규칙을 고칠 때마다 API를 다시 부르지 않는다. 다시 받으려면 --force 를 쓴다.
const path = require('node:path');
const fs = require('node:fs/promises');
const { createRequire } = require('node:module');
const { pathToFileURL } = require('node:url');

// 운영 주소. `TOUR_API_BASE_URL`은 **가짜 응답으로 검증할 때만** 쓴다 —
// 예산·흐름 테스트에 실제 공공 API를 부르지 않기 위한 문이다.
const BASE_URL = process.env.TOUR_API_BASE_URL || 'https://apis.data.go.kr/B551011/KorPetTourService2/';
const PAGE_SIZE = 100;
const REQUEST_TIMEOUT_MS = 15000;
const MAX_ATTEMPTS = 3;
const DEFAULT_CONCURRENCY = 2;

class CollectError extends Error {}

const printable = value => String(value).replace(/[\x00-\x1f\x7f]/g, ' ');

function loadKey(projectRoot) {
  const projectRequire = createRequire(path.join(projectRoot, 'package.json'));
  let loadEnvConfig;
  try {
    const nextRequire = createRequire(projectRequire.resolve('next/package.json'));
    ({ loadEnvConfig } = nextRequire('@next/env'));
  } catch {
    throw new CollectError('Next.js를 찾지 못했습니다. 파일을 프로젝트의 scripts 폴더에 넣어주세요.');
  }
  let failed = false;
  loadEnvConfig(projectRoot, true, { info() {}, error() { failed = true; } });
  if (failed) throw new CollectError('.env.local 파일을 읽지 못했습니다. 파일 형식을 확인하세요.');
  const key = process.env.TOUR_API_SERVICE_KEY?.trim();
  if (!key) throw new CollectError('.env.local의 TOUR_API_SERVICE_KEY를 확인하고 저장해주세요.');
  return key;
}

function apiError(endpoint, value) {
  const code = /^\d{1,4}$/.test(String(value)) ? String(value) : '확인 불가';
  const messages = {
    '10': '요청 파라미터가 올바르지 않습니다.',
    '20': '반려동물 동반여행 서비스의 이용 권한을 확인하세요.',
    '22': '일일 호출 한도를 초과했습니다.',
    '30': '인증키를 확인하세요. Encoding/Decoding이 나뉘어 있다면 Decoding 키를 사용하세요.',
    '31': 'API 활용 기간이 만료되었습니다.',
  };
  const error = new CollectError(
    `${endpoint}: API 오류 (${code}). ${messages[String(Number(code))] || 'API 신청 상태와 요청 조건을 확인하세요.'}`,
  );
  // 한도 초과·권한 문제는 다시 눌러도 같은 답이 온다. 재시도하지 않는다.
  error.retryable = false;
  return error;
}

/**
 * 실제 호출 예산. `main()`이 채운다. 이 값이 없으면 요청을 보내지 않는다 —
 * 예산을 세지 않는 경로가 하나라도 있으면 상한이 의미를 잃는다.
 */
let budgetGate = null;

/** 한 번의 요청. 응답이 정상(resultCode 0000)이 아니면 던진다 — 빈 결과로 삼키지 않는다. */
async function requestOnce(endpoint, params, key) {
  if (budgetGate == null) {
    throw new CollectError('호출 예산이 설정되지 않아 요청을 보내지 않았습니다.');
  }
  // **fetch 직전에 차감한다.** 실패한 요청과 재시도도 예산을 쓴 것이다.
  try {
    budgetGate.reserve(endpoint);
  } catch (error) {
    const budgetError = new CollectError(printable(error.message));
    budgetError.retryable = false;
    budgetError.budgetExhausted = true;
    throw budgetError;
  }
  const url = new URL(endpoint, BASE_URL);
  // Decoding 키를 넣으면 URLSearchParams가 한 번 인코딩합니다.
  url.search = new URLSearchParams({
    serviceKey: key, MobileOS: 'ETC', MobileApp: 'PawSpotGlobal',
    _type: 'json', numOfRows: String(PAGE_SIZE), pageNo: '1', ...params,
  }).toString();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response;
  let raw;
  try {
    response = await fetch(url, { signal: controller.signal, redirect: 'error' });
    raw = await response.text();
  } catch {
    const error = new CollectError(`${endpoint}: 연결 실패 또는 응답 시간 초과입니다.`);
    error.retryable = true;
    throw error;
  } finally {
    clearTimeout(timer);
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    const xmlCode = raw.match(/<returnReasonCode>\s*(\d{1,4})\s*<\/returnReasonCode>/)?.[1];
    if (xmlCode) throw apiError(endpoint, xmlCode);
    const error = new CollectError(`${endpoint}: JSON 응답이 아닙니다. HTTP 상태: ${response.status}`);
    error.retryable = response.status >= 500;
    throw error;
  }
  const code = data?.response?.header?.resultCode;
  if (code == null) throw new CollectError(`${endpoint}: API 결과코드가 없습니다.`);
  if (String(code) !== '0000') throw apiError(endpoint, code);
  if (!response.ok) throw new CollectError(`${endpoint}: HTTP 오류 (${response.status})`);

  const body = data.response.body;
  const value = body?.items?.item;
  const items = value == null || value === '' ? [] : Array.isArray(value) ? value : [value];
  const total = Number(body?.totalCount);
  if (body?.totalCount == null || !Number.isSafeInteger(total) || total < 0) {
    throw new CollectError(`${endpoint}: 결과 건수를 읽지 못했습니다.`);
  }
  return { fetchedAt: new Date().toISOString(), data, items, total };
}

/** 유한한 재시도. 다시 눌러도 같은 답이 오는 오류는 즉시 포기한다. */
async function request(endpoint, params, key) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await requestOnce(endpoint, params, key);
    } catch (error) {
      lastError = error;
      if (error.retryable !== true || attempt === MAX_ATTEMPTS) throw error;
      await new Promise(resolve => setTimeout(resolve, 500 * attempt));
    }
  }
  throw lastError;
}

/** 목록을 **끝 페이지까지** 읽는다. 첫 페이지만 보고 전체라고 적지 않는다. */
async function collectList(key, params) {
  const seen = new Map();
  let total = null;
  for (let pageNo = 1; ; pageNo += 1) {
    const page = await request('areaBasedList2', { ...params, pageNo: String(pageNo) }, key);
    if (total == null) total = page.total;
    for (const item of page.items) {
      const contentId = String(item?.contentid ?? '');
      const contentTypeId = String(item?.contenttypeid ?? '');
      if (!/^\d+$/.test(contentId) || !/^\d+$/.test(contentTypeId)) {
        throw new CollectError('목록 응답에 콘텐츠 ID나 관광타입이 없습니다.');
      }
      if (!seen.has(contentId)) {
        // 분류 판정의 근거가 되는 코드를 목록 단계에서부터 들고 다닌다.
        seen.set(contentId, {
          contentId,
          contentTypeId,
          title: String(item?.title ?? ''),
          lclsSystm1: String(item?.lclsSystm1 ?? ''),
          lclsSystm2: String(item?.lclsSystm2 ?? ''),
          lclsSystm3: String(item?.lclsSystm3 ?? ''),
          // 반경 판정에 쓴다. mapx=경도, mapy=위도다.
          mapx: String(item?.mapx ?? ''),
          mapy: String(item?.mapy ?? ''),
          addr1: String(item?.addr1 ?? ''),
        });
      }
    }
    if (page.items.length === 0) break;
    if (pageNo * PAGE_SIZE >= total) break;
    // 총 건수보다 페이지가 더 나오면 응답이 이상한 것이다. 무한 루프로 두지 않는다.
    if (pageNo > Math.ceil(total / PAGE_SIZE) + 1) {
      throw new CollectError('목록 페이지가 전체 건수보다 많습니다. 응답 형식을 확인하세요.');
    }
  }
  return { entries: [...seen.values()], total };
}

/**
 * 한 장소의 상세 3종. 하나라도 정상 응답이 아니면 스냅샷을 만들지 않는다.
 *
 * `entry.contentTypeId`가 없으면(`--content-id`로 직접 지정한 경우) `detailCommon2`의
 * 응답에서 읽는다. **`detailIntro2`는 관광타입에 따라 응답 필드 이름이 달라지므로**
 * 타입을 모른 채 부르면 음식점 정보를 관광지 필드로 읽어 "정보 없음"이 된다.
 */
async function collectDetail(key, entry) {
  const responses = {};

  const common = await request('detailCommon2', { contentId: entry.contentId }, key);
  if (common.total !== common.items.length) {
    throw new CollectError('detailCommon2: 결과 건수와 응답 항목이 일치하지 않습니다.');
  }
  if (common.items.length !== 1 || typeof common.items[0].title !== 'string' || !common.items[0].title.trim()) {
    throw new CollectError('장소의 기본 정보를 확인할 수 없습니다.');
  }
  if (String(common.items[0].contentid) !== entry.contentId) {
    throw new CollectError('detailCommon2: 요청한 장소와 응답의 콘텐츠 ID가 다릅니다.');
  }
  const responseTypeId = String(common.items[0].contenttypeid ?? '');
  if (entry.contentTypeId && responseTypeId && responseTypeId !== entry.contentTypeId) {
    throw new CollectError('detailCommon2: 관광타입이 예상과 다릅니다.');
  }
  const contentTypeId = entry.contentTypeId || responseTypeId;
  if (!/^\d+$/.test(contentTypeId)) {
    throw new CollectError('관광타입을 확인하지 못했습니다. detailIntro2를 부를 수 없습니다.');
  }
  responses.detailCommon2 = { fetchedAt: common.fetchedAt, data: common.data };

  for (const [endpoint, params] of [
    ['detailIntro2', { contentId: entry.contentId, contentTypeId }],
    ['detailPetTour2', { contentId: entry.contentId }],
  ]) {
    const result = await request(endpoint, params, key);
    if (result.total !== result.items.length) {
      throw new CollectError(`${endpoint}: 결과 건수와 응답 항목이 일치하지 않습니다.`);
    }
    for (const item of result.items) {
      if (!item || typeof item !== 'object' || String(item.contentid) !== entry.contentId) {
        throw new CollectError(`${endpoint}: 요청한 장소와 응답의 콘텐츠 ID가 다릅니다.`);
      }
      if (item.contenttypeid != null && String(item.contenttypeid) !== contentTypeId) {
        throw new CollectError(`${endpoint}: 관광타입이 예상과 다릅니다.`);
      }
    }
    // API 응답의 빈 값과 문구를 그대로 보존한다. 수집일은 검증일이 아니다.
    responses[endpoint] = { fetchedAt: result.fetchedAt, data: result.data };
  }

  return {
    formatVersion: 1,
    source: { provider: '한국관광공사', service: 'KorPetTourService2' },
    contentId: entry.contentId,
    contentTypeId,
    fetchedAt: new Date().toISOString(),
    reviewStatus: 'UNREVIEWED',
    responses,
  };
}

const USAGE =
  '사용법: node scripts/collect-tour-area.cjs\n' +
  '  대상: --region <법정동 시도코드> | --nationwide | --content-id <콘텐츠ID> (여러 번 가능)\n' +
  '  좁히기: [--content-type <관광타입>] [--lcls1 <코드>] [--lcls2 <코드>] [--lcls3 <코드>] [--limit N]\n' +
  '  그 외: [--concurrency N] [--list-only] [--summary] [--force] [--refresh-codes]\n' +
  '  예산: [--budget N] [--reset-budget]  — 실제 호출 횟수는 data/tour-api/call-budget.json에 남는다';

function parseArgs(argv) {
  const args = {
    region: null, contentType: null, limit: null, nationwide: false,
    lcls1: null, lcls2: null, lcls3: null, contentIds: [],
    concurrency: DEFAULT_CONCURRENCY, listOnly: false, summary: false,
    force: false, refreshCodes: false, resetBudget: false, budget: null, withinKm: null,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const next = argv[i + 1];
    if (argv[i] === '--region') { args.region = next; i += 1; }
    else if (argv[i] === '--content-type') { args.contentType = next; i += 1; }
    else if (argv[i] === '--content-id') { args.contentIds.push(String(next ?? '')); i += 1; }
    else if (argv[i] === '--lcls1') { args.lcls1 = next; i += 1; }
    else if (argv[i] === '--lcls2') { args.lcls2 = next; i += 1; }
    else if (argv[i] === '--lcls3') { args.lcls3 = next; i += 1; }
    else if (argv[i] === '--limit') { args.limit = Number(next); i += 1; }
    else if (argv[i] === '--concurrency') { args.concurrency = Number(next); i += 1; }
    else if (argv[i] === '--nationwide') args.nationwide = true;
    else if (argv[i] === '--list-only') args.listOnly = true;
    else if (argv[i] === '--summary') args.summary = true;
    else if (argv[i] === '--force') args.force = true;
    else if (argv[i] === '--refresh-codes') args.refreshCodes = true;
    else if (argv[i] === '--reset-budget') args.resetBudget = true;
    else if (argv[i] === '--within-km') { args.withinKm = Number(next); i += 1; }
    else if (argv[i] === '--budget') { args.budget = next; i += 1; }
    else throw new CollectError(`알 수 없는 옵션입니다: ${printable(argv[i])}`);
  }
  const hasRegion = args.region != null;
  const hasIds = args.contentIds.length > 0;
  // 전국 수집은 9천 건이 넘는다. 지역을 빠뜨린 실수와 구별되도록 명시적으로 요구한다.
  if ([hasRegion, args.nationwide, hasIds].filter(Boolean).length !== 1 && !args.refreshCodes) {
    throw new CollectError(USAGE);
  }
  // 세종은 `36110`처럼 5자리다(코드표 실측). 2자리로만 받으면 세종을 조회할 수 없다.
  if (hasRegion && !/^\d{1,6}$/.test(args.region)) {
    throw new CollectError('--region 은 법정동 시도코드(숫자)여야 합니다. 대전 30, 세종 36110.');
  }
  if (args.contentIds.some(id => !/^\d+$/.test(id))) {
    throw new CollectError('--content-id 는 숫자여야 합니다.');
  }
  if (hasIds && (args.contentType || args.lcls1 || args.lcls2 || args.lcls3 || args.limit)) {
    throw new CollectError('--content-id 는 목록 조회를 하지 않으므로 목록 좁히기 옵션과 함께 쓸 수 없습니다.');
  }
  for (const [name, value] of [['--lcls1', args.lcls1], ['--lcls2', args.lcls2], ['--lcls3', args.lcls3]]) {
    if (value != null && !/^[A-Z]{2}[A-Z0-9]{0,6}$/.test(value)) {
      throw new CollectError(`${name} 은 분류 체계 코드여야 합니다 (예: FD, FD05, FD050100).`);
    }
  }
  if (args.contentType != null && !/^\d{1,3}$/.test(args.contentType)) {
    throw new CollectError('--content-type 은 숫자여야 합니다.');
  }
  if (args.limit != null && (!Number.isInteger(args.limit) || args.limit < 1)) {
    throw new CollectError('--limit 은 1 이상의 정수여야 합니다.');
  }
  if (!Number.isInteger(args.concurrency) || args.concurrency < 1 || args.concurrency > 4) {
    throw new CollectError('--concurrency 는 1~4 사이여야 합니다. 공공 API에 과도한 부하를 주지 않습니다.');
  }
  return args;
}

/** 정해진 수만큼만 동시에 돈다. 실패는 모아서 돌려주고 중간에 멈추지 않는다. */
async function runLimited(entries, concurrency, worker) {
  const results = [];
  let cursor = 0;
  async function lane() {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= entries.length) return;
      results[index] = await worker(entries[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, entries.length) }, lane));
  return results;
}

/**
 * 코드표 캐시. `lclsSystmCode2`·`ldongCode2`를 받아 파일 하나로 둔다.
 * **한 번 받아 두면 분류를 판단할 때마다 API를 다시 부르지 않는다.**
 */
async function refreshCodes(key, codesPath, region) {
  const lcls1 = await request('lclsSystmCode2', { numOfRows: '100' }, key);
  const lclsSystm = { level1: {}, level2: {} };
  for (const item of lcls1.items) lclsSystm.level1[String(item.code)] = String(item.name);
  for (const code of Object.keys(lclsSystm.level1)) {
    const level2 = await request('lclsSystmCode2', { lclsSystm1: code, numOfRows: '100' }, key);
    for (const item of level2.items) lclsSystm.level2[String(item.code)] = String(item.name);
  }
  const ldong = { regions: {}, signgu: {} };
  const regions = await request('ldongCode2', { numOfRows: '100' }, key);
  for (const item of regions.items) ldong.regions[String(item.code)] = String(item.name);
  if (region) {
    const signgu = await request('ldongCode2', { lDongRegnCd: region, numOfRows: '100' }, key);
    ldong.signgu[region] = Object.fromEntries(
      signgu.items.map(item => [String(item.code), String(item.name)]),
    );
  }
  const codes = {
    formatVersion: 1,
    service: 'KorPetTourService2',
    fetchedAt: new Date().toISOString(),
    lclsSystm,
    ldong,
  };
  await fs.writeFile(codesPath, JSON.stringify(codes, null, 2) + '\n', 'utf8');
  return codes;
}

async function readCodes(codesPath) {
  try {
    return JSON.parse(await fs.readFile(codesPath, 'utf8'));
  } catch {
    return null;
  }
}

/** 목록의 분류 분포. **무엇을 얼마나 조회했는지**를 건수로 보여 준다. */
function printSummary(entries, codes, classify) {
  const groups = new Map();
  for (const entry of entries) {
    const key = [entry.contentTypeId, entry.lclsSystm1, entry.lclsSystm2].join('|');
    if (!groups.has(key)) groups.set(key, { entry, count: 0 });
    groups.get(key).count += 1;
  }
  console.log('');
  console.log('분류 분포 (관광타입 / 분류코드 → 우리 Category)');
  const rows = [...groups.values()].sort((a, b) => b.count - a.count);
  for (const { entry, count } of rows) {
    const decision = classify(entry);
    const name1 = codes?.lclsSystm?.level1?.[entry.lclsSystm1] ?? '';
    const name2 = codes?.lclsSystm?.level2?.[entry.lclsSystm2] ?? '';
    console.log(
      `  ${String(count).padStart(4)}건  타입 ${entry.contentTypeId} · ` +
        `${printable(entry.lclsSystm1 || '-')}${name1 ? `(${printable(name1)})` : ''}` +
        ` / ${printable(entry.lclsSystm2 || '-')}${name2 ? `(${printable(name2)})` : ''}` +
        ` → ${decision.category ?? '분류 검토 대상'}`,
    );
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const projectRoot = path.resolve(__dirname, '..');
  const key = loadKey(projectRoot);
  if (typeof fetch !== 'function') throw new CollectError('이 파일은 Node.js 18 이상이 필요합니다.');

  // 실제 호출 예산을 먼저 연다. 이 파일은 명령·재실행을 가로질러 남으므로
  // 다시 실행한다고 예산이 새로 생기지 않는다.
  const budget = await import(
    pathToFileURL(path.join(projectRoot, 'scripts', 'tour-api-budget.mjs')).href
  );
  const limit = budget.resolveLimit(args.budget ?? process.env.TOUR_API_CALL_BUDGET);
  budgetGate = budget.createBudgetGate(projectRoot, { limit });
  if (args.resetBudget) {
    budgetGate.reset();
    console.log(`호출 예산을 새로 시작합니다. 상한 ${limit}회.`);
  }
  const before = budgetGate.summary();
  console.log(`실제 API 호출 예산: ${before.total}/${before.limit}회 사용 · 남음 ${before.limit - before.total}회`);
  const reportBudget = () => {
    const after = budgetGate.summary();
    const perEndpoint = Object.entries(after.byEndpoint)
      .map(([endpoint, count]) => `${endpoint} ${count}`)
      .join(' · ');
    console.log('');
    console.log(`이번 실행 후 누적 호출 ${after.total}/${after.limit}회${perEndpoint ? ` (${perEndpoint})` : ''}`);
    if (after.denied > 0) console.log(`상한 때문에 보내지 않은 요청 ${after.denied}건`);
  };
  process.on('exit', reportBudget);

  const { classifyContent, distanceFromServiceCenter, SERVICE_AREA_CENTER } = await import(
    pathToFileURL(path.join(projectRoot, 'scripts', 'tour-classification.mjs')).href
  );

  const outputDir = path.join(projectRoot, 'data', 'tour-api');
  await fs.mkdir(outputDir, { recursive: true });
  const codesPath = path.join(outputDir, 'codes.json');

  // **코드표 갱신은 언제나 여기서 끝난다.** `--region`을 함께 준 것은 어느 시군구 표를
  // 캐시할지 고른 것이지 수집하라는 뜻이 아니다. 두 일을 한 명령에 묶었더니 코드표만
  // 받으려던 실행이 지역 전체 상세 수집(건당 3회 호출)까지 이어졌다.
  if (args.refreshCodes) {
    console.log('코드표를 조회합니다 (lclsSystmCode2 · ldongCode2)...');
    const codes = await refreshCodes(key, codesPath, args.region);
    console.log(
      `코드표를 저장했습니다: data/tour-api/codes.json · ` +
        `1단계 ${Object.keys(codes.lclsSystm.level1).length}개 · 2단계 ${Object.keys(codes.lclsSystm.level2).length}개 · 시도 ${Object.keys(codes.ldong.regions).length}개`,
    );
    console.log('수집은 하지 않았습니다. 수집하려면 --refresh-codes 없이 다시 실행하세요.');
    return;
  }
  const codes = await readCodes(codesPath);

  const existingFiles = await fs.readdir(outputDir);
  const haveSnapshot = new Set(
    existingFiles.map(name => name.match(/^place-(\d+)-.*\.json$/i)?.[1]).filter(Boolean),
  );

  let entries;
  let total;
  if (args.contentIds.length > 0) {
    // 목록을 부르지 않는다. 관광타입은 detailCommon2 응답에서 읽는다.
    entries = [...new Set(args.contentIds)].map(contentId => ({
      contentId, contentTypeId: null, title: '(목록 조회 없음)',
      lclsSystm1: '', lclsSystm2: '', lclsSystm3: '',
    }));
    total = entries.length;
    console.log(`콘텐츠 ${entries.length}건을 직접 조회합니다 (목록 호출 없음).`);
  } else {
    const listParams = { arrange: 'C' };
    if (args.region) listParams.lDongRegnCd = args.region;
    if (args.contentType) listParams.contentTypeId = args.contentType;
    if (args.lcls1) listParams.lclsSystm1 = args.lcls1;
    if (args.lcls2) listParams.lclsSystm2 = args.lcls2;
    if (args.lcls3) listParams.lclsSystm3 = args.lcls3;

    const scope = args.region ? `지역 ${args.region}` : '전국';
    const narrowed = [
      args.contentType ? `관광타입 ${args.contentType}` : null,
      args.lcls1 ? `분류1 ${args.lcls1}` : null,
      args.lcls2 ? `분류2 ${args.lcls2}` : null,
      args.lcls3 ? `분류3 ${args.lcls3}` : null,
    ].filter(Boolean);
    console.log(`${scope}${narrowed.length ? ` · ${narrowed.join(' · ')}` : ''} 목록을 조회합니다...`);
    ({ entries, total } = await collectList(key, listParams));
    // 첫 페이지만 보고 전체라고 적지 않는다. 총 건수와 실제로 받은 건수를 함께 적는다.
    console.log(`조회 범위: ${scope}${narrowed.length ? ` · ${narrowed.join(' · ')}` : ''}`);
    console.log(`목록 응답 총 ${total}건 · 끝 페이지까지 받은 서로 다른 콘텐츠 ${entries.length}건`);
    if (args.summary) printSummary(entries, codes, classifyContent);

    if (args.withinKm != null) {
      if (!Number.isFinite(args.withinKm) || args.withinKm <= 0) {
        throw new CollectError('--within-km 은 0보다 큰 숫자여야 합니다.');
      }
      // **좌표로 가른다.** 행정구역 포함 여부를 반경 판정으로 대신하지 않는다.
      const limitMeters = args.withinKm * 1000;
      const inside = [];
      let outside = 0;
      let noCoords = 0;
      for (const entry of entries) {
        const meters = distanceFromServiceCenter(entry.mapy, entry.mapx);
        if (meters == null) { noCoords += 1; continue; }
        entry.distanceMeters = meters;
        if (meters <= limitMeters) inside.push(entry); else outside += 1;
      }
      console.log(
        `반경 ${args.withinKm}km 안 ${inside.length}건 · 밖 ${outside}건 · 좌표 없음 ${noCoords}건 ` +
          `(중심 ${SERVICE_AREA_CENTER.lat}, ${SERVICE_AREA_CENTER.lng})`,
      );
      inside.sort((a, b) => a.distanceMeters - b.distanceMeters);
      entries = inside;
    }
  }

  const fresh = args.force ? entries : entries.filter(entry => !haveSnapshot.has(entry.contentId));
  const alreadyHave = entries.length - fresh.length;
  const targets = args.limit ? fresh.slice(0, args.limit) : fresh;

  console.log(`이미 있는 스냅샷 ${alreadyHave}건 · 이번에 받을 대상 ${targets.length}건`);
  if (args.listOnly || targets.length === 0) {
    for (const entry of entries) {
      const decision = classifyContent(entry);
      const km = entry.distanceMeters == null ? '' : ` · ${(entry.distanceMeters / 1000).toFixed(1)}km`;
      console.log(
        `  ${entry.contentId} · 타입 ${entry.contentTypeId ?? '?'} · ` +
          `${printable(entry.lclsSystm2 || '-')} → ${decision.category ?? '분류 검토 대상'}${km} · ` +
          `${printable(entry.title)} · ${printable(entry.addr1 || '')}`,
      );
    }
    console.log('');
    console.log(args.listOnly ? '목록만 조회했습니다. 상세는 호출하지 않았습니다.' : '새로 받을 대상이 없습니다.');
    return;
  }

  const saved = [];
  const failures = [];
  await runLimited(targets, args.concurrency, async (entry) => {
    try {
      const snapshot = await collectDetail(key, entry);
      const serialized = JSON.stringify(snapshot, null, 2) + '\n';
      const secrets = [key, encodeURIComponent(key), new URLSearchParams({ k: key }).toString().slice(2)];
      if (secrets.some(secret => serialized.includes(secret))) {
        throw new CollectError('응답에 인증키가 포함되어 있어 파일 저장을 중단했습니다.');
      }
      const filename = `place-${entry.contentId}-${snapshot.fetchedAt.replace(/[:.]/g, '-')}.json`;
      const outputPath = path.join(outputDir, filename);
      // 기존 파일을 덮어쓰지 않는다. 같은 콘텐츠의 스냅샷이 둘이 되면 변환이 충돌을 알린다.
      const handle = await fs.open(outputPath, 'wx');
      try {
        await handle.writeFile(serialized, 'utf8');
      } finally {
        await handle.close();
      }
      saved.push({ entry, filename });
      console.log(`  받음 ${entry.contentId} · ${printable(entry.title)}`);
    } catch (error) {
      // 정상 응답이 아닌 것을 수집된 것으로 세지 않는다.
      failures.push(`${entry.contentId} (${printable(entry.title)}): ${printable(error.message)}`);
      console.error(`  실패 ${entry.contentId} · ${printable(error.message)}`);
    }
  });

  console.log('');
  console.log(`대상 ${targets.length}건 · 수집 ${saved.length}건 · 실패 ${failures.length}건 · 건너뜀 ${alreadyHave}건(이미 있음)`);
  for (const line of failures) console.error(`  - ${line}`);
  console.log('');
  console.log('이 파일들은 등록 전 검토용 원본 데이터입니다. 변환은 API를 다시 부르지 않습니다:');
  console.log('  node scripts/prepare-tour-import.cjs --dir data/tour-api');
  if (failures.length > 0) process.exitCode = 1;
}

main().catch(error => {
  console.error(printable(error instanceof CollectError ? error.message : '실행 중 오류가 발생했습니다. 파일 위치와 환경변수 설정을 확인하세요.'));
  process.exitCode = 1;
});
