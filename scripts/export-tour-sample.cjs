// 프로젝트의 scripts 폴더에 넣고 실행: node scripts/export-tour-sample.cjs
// API 매뉴얼: 한국관광공사 반려동물 동반여행 서비스 v4.1
const path = require('node:path');
const fs = require('node:fs/promises');
const { createRequire } = require('node:module');

const CONTENT_ID = '129438';
const CONTENT_TYPE_ID = '12';
const BASE_URL = 'https://apis.data.go.kr/B551011/KorPetTourService2/';

class ExportError extends Error {}

function loadKey(projectRoot) {
  const projectRequire = createRequire(path.join(projectRoot, 'package.json'));
  let loadEnvConfig;
  try {
    const nextRequire = createRequire(projectRequire.resolve('next/package.json'));
    ({ loadEnvConfig } = nextRequire('@next/env'));
  } catch {
    throw new ExportError('Next.js를 찾지 못했습니다. 파일을 프로젝트의 scripts 폴더에 넣어주세요.');
  }
  let failed = false;
  loadEnvConfig(projectRoot, true, { info() {}, error() { failed = true; } });
  if (failed) throw new ExportError('.env.local 파일을 읽지 못했습니다. 파일 형식을 확인하세요.');
  const key = process.env.TOUR_API_SERVICE_KEY?.trim();
  if (!key) throw new ExportError('.env.local의 TOUR_API_SERVICE_KEY를 확인하고 저장해주세요.');
  return key;
}

function apiError(endpoint, value) {
  const code = /^\d{1,4}$/.test(String(value)) ? String(value) : '확인 불가';
  const messages = {
    '20': '반려동물 동반여행 서비스의 이용 권한을 확인하세요.',
    '22': '일일 호출 한도를 초과했습니다.',
    '30': '인증키를 확인하세요. Encoding/Decoding이 나뉘어 있다면 Decoding 키를 사용하세요.',
    '31': 'API 활용 기간이 만료되었습니다.',
  };
  return new ExportError(`${endpoint}: API 오류 (${code}). ${messages[String(Number(code))] || 'API 신청 상태와 요청 조건을 확인하세요.'}`);
}

/** 실제 호출 예산. main()이 채운다. 비어 있으면 요청을 보내지 않는다. */
let budgetGate = null;

async function request(endpoint, params, key) {
  if (budgetGate == null) throw new ExportError('호출 예산이 설정되지 않아 요청을 보내지 않았습니다.');
  // fetch 직전에 차감한다. 이 스크립트도 같은 예산을 쓴다 — 명령을 바꿔 상한을 우회할 수 없다.
  budgetGate.reserve(endpoint);
  const url = new URL(endpoint, BASE_URL);
  // Decoding 키를 넣으면 URLSearchParams가 한 번 인코딩합니다.
  url.search = new URLSearchParams({
    serviceKey: key, MobileOS: 'ETC', MobileApp: 'PawSpotGlobal',
    _type: 'json', numOfRows: '10', pageNo: '1', ...params,
  }).toString();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  let response;
  let raw;
  try {
    response = await fetch(url, { signal: controller.signal, redirect: 'error' });
    raw = await response.text();
  } catch {
    throw new ExportError(`${endpoint}: 연결 실패 또는 응답 시간 초과입니다. 잠시 후 다시 실행하세요.`);
  } finally {
    clearTimeout(timer);
  }
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    const xmlCode = raw.match(/<returnReasonCode>\s*(\d{1,4})\s*<\/returnReasonCode>/)?.[1];
    if (xmlCode) throw apiError(endpoint, xmlCode);
    throw new ExportError(`${endpoint}: JSON 응답이 아닙니다. HTTP 상태: ${response.status}`);
  }
  const code = data?.response?.header?.resultCode;
  if (code == null) throw new ExportError(`${endpoint}: API 결과코드가 없습니다.`);
  if (String(code) !== '0000') throw apiError(endpoint, code);
  if (!response.ok) throw new ExportError(`${endpoint}: HTTP 오류 (${response.status})`);

  const body = data.response.body;
  const value = body?.items?.item;
  const items = value == null || value === '' ? [] : Array.isArray(value) ? value : [value];
  const count = body?.totalCount;
  const total = Number(count);
  if (count == null || String(count).trim() === '' || !Number.isSafeInteger(total) || total < 0 || total !== items.length) {
    throw new ExportError(`${endpoint}: 결과 건수와 응답 항목이 일치하지 않습니다.`);
  }
  for (const item of items) {
    if (!item || typeof item !== 'object' || String(item.contentid) !== CONTENT_ID) {
      throw new ExportError(`${endpoint}: 요청한 장소와 응답의 콘텐츠 ID가 다릅니다.`);
    }
    if (item.contenttypeid != null && String(item.contenttypeid) !== CONTENT_TYPE_ID) {
      throw new ExportError(`${endpoint}: 관광타입이 예상과 다릅니다.`);
    }
  }
  return { fetchedAt: new Date().toISOString(), data, items };
}

async function main() {
  const budgetProjectRoot = path.resolve(__dirname, '..');
  const budget = await import(
    require('node:url').pathToFileURL(path.join(budgetProjectRoot, 'scripts', 'tour-api-budget.mjs')).href
  );
  budgetGate = budget.createBudgetGate(budgetProjectRoot);
  const before = budgetGate.summary();
  console.log(`실제 API 호출 예산: ${before.total}/${before.limit}회 사용`);

  const projectRoot = path.resolve(__dirname, '..');
  const key = loadKey(projectRoot);
  if (typeof fetch !== 'function') throw new ExportError('이 파일은 Node.js 18 이상이 필요합니다. node -v로 확인하세요.');

  const requests = [
    ['detailCommon2', '기본 정보', { contentId: CONTENT_ID }],
    ['detailIntro2', '운영 정보', { contentId: CONTENT_ID, contentTypeId: CONTENT_TYPE_ID }],
    ['detailPetTour2', '반려동물 동반 정보', { contentId: CONTENT_ID }],
  ];
  const responses = {};
  let title = '';
  console.log(`장태산자연휴양림 (contentid: ${CONTENT_ID})의 상세 정보를 수집합니다.`);
  for (const [index, [endpoint, label, params]] of requests.entries()) {
    console.log(`[${index + 1}/3] ${label} 조회 중...`);
    const result = await request(endpoint, params, key);
    if (endpoint === 'detailCommon2') {
      if (result.items.length !== 1 || typeof result.items[0].title !== 'string' || !result.items[0].title.trim()) {
        throw new ExportError('장소의 기본 정보를 확인할 수 없어 저장을 중단했습니다.');
      }
      title = result.items[0].title;
    }
    // API 응답의 빈 값과 문구를 그대로 보존합니다. 수집일은 검증일이 아닙니다.
    responses[endpoint] = { fetchedAt: result.fetchedAt, data: result.data };
    console.log(`  ${label}: ${result.items.length}건${result.items.length === 0 ? ' (정보 미제공)' : ''}`);
  }

  const fetchedAt = new Date().toISOString();
  const snapshot = {
    formatVersion: 1,
    source: { provider: '한국관광공사', service: 'KorPetTourService2' },
    contentId: CONTENT_ID,
    contentTypeId: CONTENT_TYPE_ID,
    fetchedAt,
    reviewStatus: 'UNREVIEWED',
    responses,
  };
  const serialized = JSON.stringify(snapshot, null, 2) + '\n';
  const secrets = [key, encodeURIComponent(key), new URLSearchParams({ k: key }).toString().slice(2)];
  if (secrets.some(secret => serialized.includes(secret))) {
    throw new ExportError('응답에 인증키가 포함되어 있어 파일 저장을 중단했습니다.');
  }
  const filename = `place-${CONTENT_ID}-${fetchedAt.replace(/[:.]/g, '-')}.json`;
  const outputDir = path.join(projectRoot, 'data', 'tour-api');
  const outputPath = path.join(outputDir, filename);
  try {
    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(outputPath, serialized, { encoding: 'utf8', flag: 'wx' });
  } catch {
    throw new ExportError('JSON 저장에 실패했습니다. data/tour-api 폴더의 쓰기 권한과 디스크 공간을 확인하세요.');
  }
  console.log(`수집 완료: ${title.replace(/[\x00-\x1f\x7f]/g, ' ')}`);
  console.log(`저장 완료: ${path.relative(projectRoot, outputPath)}`);
  console.log('이 파일은 등록 전 검토용 원본 데이터입니다.');
}

main().catch(error => {
  console.error(error instanceof ExportError ? error.message : '실행 중 오류가 발생했습니다. 파일 위치와 환경변수 설정을 확인하세요.');
  process.exitCode = 1;
});
