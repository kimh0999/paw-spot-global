// Place this file in your project's scripts folder, then run:
// node scripts/check-tour-api.cjs
// Environment loading: https://nextjs.org/docs/app/guides/environment-variables#loading-environment-variables-with-nextenv
const path = require('node:path');
const { createRequire } = require('node:module');

class CheckError extends Error {}

async function main() {
  const projectRoot = path.resolve(__dirname, '..');
  const projectRequire = createRequire(path.join(projectRoot, 'package.json'));
  let loadEnvConfig;
  try {
    const nextRequire = createRequire(projectRequire.resolve('next/package.json'));
    ({ loadEnvConfig } = nextRequire('@next/env'));
  } catch {
    throw new CheckError('Next.js를 찾지 못했습니다. 파일을 프로젝트의 scripts 폴더에 넣고, 프로젝트 의존성이 설치되어 있는지 확인하세요.');
  }

  let envReadFailed = false;
  loadEnvConfig(projectRoot, true, {
    info() {},
    error() { envReadFailed = true; },
  });
  if (envReadFailed) {
    throw new CheckError('환경변수 파일을 읽지 못했습니다. .env.local의 형식을 확인하세요.');
  }
  const key = process.env.TOUR_API_SERVICE_KEY?.trim();
  if (!key) {
    throw new CheckError('TOUR_API_KEY가 비어 있습니다. 프로젝트 최상위의 .env.local에 설정한 뒤 저장하세요.');
  }
  if (typeof fetch !== 'function') {
    throw new CheckError('이 파일은 fetch를 지원하는 Node.js 18 이상이 필요합니다. node -v로 버전을 확인하세요.');
  }

  // Give URLSearchParams the Decoding key so it is encoded once.
  const url = new URL('https://apis.data.go.kr/B551011/KorPetTourService2/areaBasedList2');
  url.search = new URLSearchParams({
    serviceKey: key,
    MobileOS: 'ETC',
    MobileApp: 'PawSpotGlobal',
    _type: 'json',
    numOfRows: '10',
    pageNo: '1',
    arrange: 'C',
    lDongRegnCd: '30',
  }).toString();

  // 이 연결 확인도 같은 예산을 쓴다. 상한을 우회하는 명령을 남기지 않는다.
  const budget = await import(
    require('node:url').pathToFileURL(path.join(projectRoot, 'scripts', 'tour-api-budget.mjs')).href
  );
  const budgetGate = budget.createBudgetGate(projectRoot);
  try {
    budgetGate.reserve('areaBasedList2');
  } catch (error) {
    throw new CheckError(String(error.message));
  }

  console.log('대전 장소 목록을 조회합니다...');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  let response;
  let raw;
  try {
    response = await fetch(url, { signal: controller.signal, redirect: 'error' });
    raw = await response.text();
  } catch {
    throw new CheckError('API에 연결하지 못했거나 15초 안에 응답을 받지 못했습니다. 잠시 후 다시 실행하세요.');
  } finally {
    clearTimeout(timer);
  }

  const apiErrors = {
    '10': '요청 파라미터가 올바르지 않습니다.',
    '20': '반려동물 동반여행 서비스의 이용 권한을 확인하세요.',
    '22': '일일 호출 한도를 초과했습니다.',
    '30': '인증키를 확인하세요. Encoding/Decoding이 나뉘어 있다면 Decoding 키를 사용하세요.',
    '31': 'API 활용 기간이 만료되었습니다.',
  };
  const apiError = (value) => {
    const code = /^\d{1,4}$/.test(String(value)) ? String(value) : '확인 불가';
    return new CheckError(`API 오류 (${code}): ${apiErrors[String(Number(code))] || 'API 신청 상태와 요청 조건을 확인하세요.'}`);
  };

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    // Authentication errors may be XML even when JSON was requested.
    const xmlCode = raw.match(/<returnReasonCode>\s*(\d{1,4})\s*<\/returnReasonCode>/)?.[1];
    if (xmlCode) throw apiError(xmlCode);
    throw new CheckError(`JSON 응답을 받지 못했습니다. HTTP 상태: ${response.status}`);
  }
  const code = data?.response?.header?.resultCode;
  if (code == null) {
    throw new CheckError(`API 결과코드를 찾지 못했습니다. HTTP 상태: ${response.status}`);
  }
  if (String(code) !== '0000') throw apiError(code);
  if (!response.ok) throw new CheckError(`HTTP 오류 (${response.status})`);

  const body = data.response.body;
  const value = body?.items?.item;
  const items = value == null || value === '' ? [] : Array.isArray(value) ? value : [value];
  const total = Number(body?.totalCount);
  if (!Number.isSafeInteger(total) || total < 0 || items.some(item => !item || typeof item !== 'object' || typeof item.title !== 'string' || !item.contentid)) {
    throw new CheckError('장소 목록의 응답 형식이 예상과 다릅니다.');
  }
  if (total > 0 && items.length === 0) {
    throw new CheckError('전체 건수는 있으나 첫 페이지 목록이 비어 있습니다. 잠시 후 다시 확인하세요.');
  }

  const secrets = [key, encodeURIComponent(key), new URLSearchParams({ k: key }).toString().slice(2)];
  const clean = (value) => secrets.reduce((s, secret) => s.split(secret).join('[인증키 숨김]'), String(value ?? '')).replace(/[\x00-\x1f\x7f]/g, ' ');
  console.log(`API 조회 성공: 총 ${total}건 중 ${items.length}건을 받았습니다.`);
  items.forEach((item, index) => {
    console.log(`${index + 1}. ${clean(item.title)} (contentid: ${clean(item.contentid)})`);
    console.log(`   주소: ${clean(item.addr1)}`);
  });
}

main().catch(error => {
  console.error(error instanceof CheckError ? error.message : '실행 중 오류가 발생했습니다. 파일 위치와 환경변수 설정을 확인하세요.');
  process.exitCode = 1;
});
