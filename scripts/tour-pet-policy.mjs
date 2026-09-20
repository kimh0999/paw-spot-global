/**
 * TourAPI 원문 → **검토용 제안 값** 대응표.
 *
 * 이 파일은 DB에 쓰지 않는다. 만드는 것은 사람이 관리자 화면에서 대조할 자료뿐이다.
 * 각 항목은 `원문 필드/문장 → 제안 값 → 근거 → 미확인 사항` 네 칸으로 떨어진다.
 *
 * **해석하지 않는 것을 규칙으로 못박는다.**
 *   - `"전 견종 동반 가능"`을 체중 제한 없음(`maxDogSize`)으로 바꾸지 않는다.
 *   - `"자유이용"`을 목줄 불필요·반려견 요금 무료로 읽지 않는다.
 *   - `"테라스만 가능"`·`"야외 좌석 동반 가능"`을 실내 가능으로 읽지 않는다.
 *   - `"주차 무료"`를 반려견 추가요금 무료로 읽지 않는다.
 *   - `etcAcmpyInfo` 자유 텍스트는 **자동으로 쪼개 넣지 않는다.** 사람이 읽을 조각으로만 표시한다.
 *
 * 빈 문자열은 "제한 없음"이 아니라 **"미제공"**이다. 그래서 제안 값이 생기지 않고
 * `unresolved`(미확인)로 떨어진다.
 */

import { PET_TOUR_FIELDS } from "./tour-classification.mjs";

/**
 * TourAPI 응답의 자유 텍스트에는 **HTML이 섞여 온다.** 실측: `parking`에 `"가능<br>
요금 (무료)"`,
 * `usetime`에 `<br>`. 태그를 그대로 두면 화면에 `<br>`이 글자로 나오고, 운영시간 파서도
 * 붙어 버린 글자 때문에 구간을 잘못 읽는다. **태그를 지우고 줄바꿈으로 바꾼다.**
 */
export function decodeApiText(value) {
  if (typeof value !== "string") return "";
  return value
    .replace(/<\s*br\s*\/?\s*>\s*/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "\'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const text = (value) => decodeApiText(value);

/**
 * `acmpyTypeCd`에서 실제로 확인한 값만 매핑한다.
 * 확인 시각·근거는 `docs/02-design/TourAPI-활용-계획-기준.md`에 적는다.
 * 여기 없는 값은 `UNKNOWN`으로 남기고 사람이 본다 — 비슷해 보인다고 끼워 맞추지 않는다.
 */
/**
 * `acmpyTypeCd`가 말하는 것은 **동반 가능한 구역의 범위**이지 실내 입장 여부가 아니다.
 *
 * 야외 공원의 `"전구역 동반가능"`은 공원 전체를 함께 걸을 수 있다는 뜻이고,
 * 그 공원 안 매점·전시관에 들어갈 수 있다는 확인이 아니다. 둘을 같은 값으로 읽으면
 * `실내 가능` 필터가 실내를 확인한 적 없는 장소를 통과시킨다.
 *
 * **그래서 이 값으로 `PlaceCondition.indoor`를 제안하지 않는다.** 원문 범위는
 * `accompanyScope`로 따로 보존하고, 실내 여부는 `UNKNOWN`으로 남겨 사람이 확인한다.
 */
export const ACMPY_TYPE_SCOPE = {
  "전구역 동반가능": {
    scope: "ALL_AREAS",
    label: "전 구역 동반 가능(원문)",
    note: "장소 전체를 함께 다닐 수 있다는 뜻이다. 실내 입장 허용 여부는 이 값으로 알 수 없다.",
  },
  "일부구역 동반가능": {
    scope: "SOME_AREAS",
    label: "일부 구역 동반 가능(원문)",
    note: "어느 구역인지 원문에 없다. 실내인지 실외인지도 알 수 없다.",
  },
};

/**
 * `acmpyNeedMtr`는 쉼표로 이어 붙은 짧은 문구 목록이다.
 * **컬럼으로 바로 옮길 수 있는 것은 목줄뿐이고**, 나머지는 적용 범위(실내/상시)가
 * 원문에 없어 `CarrierStrollerPolicy`의 어느 값인지 정할 수 없다.
 */
const NEED_MTR_RULES = [
  {
    match: (token) => token === "목줄 착용",
    proposal: {
      target: "PlaceCondition.leash",
      value: "REQUIRED",
      basis: '동반 시 필요사항에 "목줄 착용"이 있다.',
      policyDetails: {
        path: "preparation",
        value: { mode: "ALL_OF", scope: "UNKNOWN", items: [{ item: "LEASH", status: "REQUIRED" }] },
      },
    },
  },
  {
    match: (token) => token === "자유이용",
    uncertainty: {
      target: "LEASH",
      reason:
        '"자유이용"은 목줄이 필요 없다는 뜻도, 반려견 요금이 무료라는 뜻도 아니다. 무엇이 자유인지 원문에 없다.',
      question: "목줄 착용이 필요한가요? 반려견 동반에 추가 요금이 있나요?",
    },
  },
  {
    match: (token) => /이동장|켄넬|유모차/.test(token),
    uncertainty: {
      target: "CARRIER_STROLLER",
      reason:
        "이동장·유모차 사용이 실내에서만인지 상시인지 원문에 없어 REQUIRED_INDOOR/REQUIRED_ALWAYS를 고를 수 없다.",
      question: "이동장(또는 유모차)은 실내에서만 필요한가요, 매장 전체에서 필요한가요?",
    },
  },
  {
    match: (token) => /매너벨트|배변|기저귀/.test(token),
    uncertainty: {
      target: "PREPARATION",
      reason: "현재 준비물 코드 목록에 해당 항목이 없어 그대로 담을 수 없다.",
      question: "해당 준비물이 필수인가요, 권장인가요?",
    },
  },
  {
    match: (token) => token === "기타",
    uncertainty: {
      target: "PREPARATION",
      reason: '"기타"의 내용이 원문에 없다.',
      question: "그 밖에 필요한 준비물이 있나요?",
    },
  },
];

/** 자유 텍스트에서 **찾아낸 낱말을 신고만 한다.** 값으로 바꾸지 않는다. */
const FREE_TEXT_FLAGS = [
  { pattern: /입마개/, target: "MUZZLE", reason: "입마개 조건이 원문에 있으나 적용 대상(견종·상황)이 문장에 섞여 있다." },
  { pattern: /배변|위생|청결/, target: "HYGIENE", reason: "위생 수칙이 원문에 있다. 어떤 항목인지 사람이 골라야 한다." },
  { pattern: /불가/, target: "SPACE", reason: "동반이 불가한 구역이 원문에 있다. 전체 불가인지 일부 구역인지 문장으로 확인해야 한다." },
  { pattern: /실내|테라스|야외|좌석/, target: "INDOOR", reason: "구역 조건이 원문에 있다. 분류코드(acmpyTypeCd)와 어긋날 수 있다." },
  { pattern: /kg|킬로|무게|체중|소형|중형|대형/, target: "MAX_DOG_SIZE", reason: "크기 조건이 원문에 있다. kg 단위 제한은 SMALL/MEDIUM/LARGE에 그대로 담을 수 없다." },
  { pattern: /요금|비용|원\b|유료|무료/, target: "ADMISSION", reason: "요금 관련 문구가 원문에 있다. 반려견 요금인지 사람 요금·주차 요금인지 구분해야 한다." },
  { pattern: /예방접종|접종|동물등록/, target: "VACCINATION_COMPLETION", reason: "예방접종·동물등록 요구가 원문에 있다. 증빙 지참(vaccinationCertificatePolicy)과는 다른 조건이다." },
  { pattern: /맹견|견종|체고/, target: "BREED_RESTRICTIONS", reason: "견종·체고 조건이 원문에 있다. 체고(cm) 기준은 SMALL/MEDIUM/LARGE로 옮길 수 없다." },
];

/** 표시용 분할. 구분자 `- `가 줄바꿈 없이 붙어 있어 **정확한 분해가 아니다.** */
export function splitFreeText(value) {
  return text(value)
    .split(/\s*-\s+|\r?\n/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * 반려견 동반 원문 → 검토 자료.
 *
 * `blocked`가 있으면 **추천 후보에서 제외한다.** 판단 근거는 분류값(`acmpyTypeCd`)뿐이고
 * 자유 텍스트로는 막지 않는다 — `"숙박시설은 동반 불가"`처럼 일부 구역만 가리키는 문장이
 * 장소 전체를 지워 버리기 때문이다.
 */
export function buildPetPolicyReview(petItem) {
  const raw = Object.fromEntries(PET_TOUR_FIELDS.map((field) => [field, text(petItem?.[field])]));
  const proposals = [];
  const unresolved = [];
  const add = (list, entry) => {
    if (!list.some((existing) => existing.target === entry.target && existing.quote === entry.quote)) {
      list.push(entry);
    }
  };

  const acmpyTypeCd = raw.acmpyTypeCd;
  let blocked = null;
  /** 원문이 말한 동반 가능 범위. 실내 여부와 분리해 보존한다. */
  let accompanyScope = null;

  if (!acmpyTypeCd) {
    add(unresolved, {
      field: "acmpyTypeCd",
      quote: null,
      target: "INDOOR",
      reason: "동반 가능 구역이 미제공이다. 빈 값은 제한 없음이 아니다.",
      question: "실내에도 반려견이 들어갈 수 있나요?",
    });
  } else if (/불가/.test(acmpyTypeCd) && !/가능/.test(acmpyTypeCd)) {
    blocked = {
      field: "acmpyTypeCd",
      quote: acmpyTypeCd,
      reason: "분류값이 반려견 동반 불가를 말한다. 추천 후보에서 제외한다.",
    };
  } else if (ACMPY_TYPE_SCOPE[acmpyTypeCd]) {
    // 범위는 그대로 보존하고, **실내 여부는 제안하지 않는다.**
    accompanyScope = { code: acmpyTypeCd, ...ACMPY_TYPE_SCOPE[acmpyTypeCd] };
    add(unresolved, {
      field: "acmpyTypeCd",
      quote: acmpyTypeCd,
      target: "INDOOR",
      reason: `${ACMPY_TYPE_SCOPE[acmpyTypeCd].note} 실내 동반을 확인한 원문이 없으면 UNKNOWN으로 둔다.`,
      question: "건물 안(매장·전시관 등)에도 반려견이 들어갈 수 있나요?",
    });
    if (accompanyScope.scope === "SOME_AREAS") {
      add(unresolved, {
        field: "acmpyTypeCd",
        quote: acmpyTypeCd,
        target: "SPACE",
        reason: "어느 구역이 가능하고 어느 구역이 안 되는지 분류값에 없다.",
        question: "반려견이 들어갈 수 있는 구역과 들어갈 수 없는 구역을 알려주세요.",
      });
    }
  } else {
    add(unresolved, {
      field: "acmpyTypeCd",
      quote: acmpyTypeCd,
      target: "INDOOR",
      reason: "실제 응답에서 확인하지 않은 분류값이다. 비슷해 보인다고 끼워 맞추지 않는다.",
      question: "실내 동반이 가능한가요?",
    });
  }

  for (const token of raw.acmpyNeedMtr.split(",").map((part) => part.trim()).filter(Boolean)) {
    const rule = NEED_MTR_RULES.find((candidate) => candidate.match(token));
    if (rule?.proposal) {
      proposals.push({ field: "acmpyNeedMtr", quote: token, ...rule.proposal });
      continue;
    }
    add(unresolved, {
      field: "acmpyNeedMtr",
      quote: token,
      ...(rule?.uncertainty ?? {
        target: "PREPARATION",
        reason: "확인하지 않은 문구다. 어떤 조건인지 사람이 확인해야 한다.",
        question: "이 조건이 무엇을 요구하는지 알려주세요.",
      }),
    });
  }

  // 동반 가능 동물·안전조치는 **그대로 옮기지 않는다.** 응답에서 두 필드에 같은 견종 문구가
  // 들어 있는 경우를 확인했다 — 필드 이름이 내용을 보장하지 않는다.
  for (const field of ["acmpyPsblCpam", "relaAcdntRiskMtr"]) {
    if (!raw[field] && field === "relaAcdntRiskMtr") continue;
    add(unresolved, {
      field,
      quote: raw[field] || null,
      target: "MAX_DOG_SIZE",
      reason: raw[field]
        ? '"전 견종 가능"·"모든견종"은 체중 제한이 없다는 확인이 아니다. kg 단위 제한은 SMALL/MEDIUM/LARGE에 그대로 담을 수 없다.'
        : "동반 가능 동물이 미제공이다. 빈 값은 제한 없음이 아니다.",
      question: "무게나 크기 제한이 있나요? 제한이 있다면 기준을 알려주세요.",
    });
  }

  for (const field of ["relaPosesFclty", "relaFrnshPrdlst", "relaPurcPrdlst", "relaRntlPrdlst"]) {
    if (!raw[field]) continue;
    add(unresolved, {
      field,
      quote: raw[field],
      target: field === "relaPosesFclty" ? "SPACE" : "PREPARATION",
      reason: "보유 시설·물품 정보다. 동반 조건 자체는 아니므로 그대로 조건으로 옮기지 않는다.",
      question: "이 시설·물품이 반려견 동반 조건과 관련이 있나요?",
    });
  }

  // 자유 텍스트가 들어오는 필드는 `etcAcmpyInfo`만이 아니다. 동반 가능 동물 칸에
  // "맹견 제외 필수 예방접종 및 동물등록 완료" 같은 문장이 들어온 것을 확인했다.
  const segments = splitFreeText(raw.etcAcmpyInfo);
  const freeTexts = [
    ...segments.map((segment) => ["etcAcmpyInfo", segment]),
    ...["acmpyPsblCpam", "relaAcdntRiskMtr"].filter((field) => raw[field]).map((field) => [field, raw[field]]),
  ];
  for (const [field, segment] of freeTexts) {
    for (const flag of FREE_TEXT_FLAGS) {
      if (flag.pattern.test(segment)) {
        add(unresolved, {
          field,
          quote: segment,
          target: flag.target,
          reason: flag.reason,
          question: "안내문의 이 문장이 어떤 조건을 뜻하는지 확인해 주세요.",
        });
      }
    }
  }

  // 분류값과 설명이 어긋나는 곳. 한쪽을 조용히 고르지 않는다.
  const conflicts = [];
  if (acmpyTypeCd === "일부구역 동반가능" && /전체 동반|전 구역|전구역/.test(raw.etcAcmpyInfo)) {
    conflicts.push({
      reason: `분류값은 "${acmpyTypeCd}"인데 안내문은 전체 동반 가능이라고 적혀 있다.`,
      quotes: [acmpyTypeCd, raw.etcAcmpyInfo],
    });
  }
  if (acmpyTypeCd === "전구역 동반가능" && /불가/.test(raw.etcAcmpyInfo)) {
    conflicts.push({
      reason: `분류값은 "${acmpyTypeCd}"인데 안내문에 동반 불가 구역이 있다.`,
      quotes: [acmpyTypeCd, raw.etcAcmpyInfo],
    });
  }

  return { raw, segments, accompanyScope, proposals, unresolved, conflicts, blocked };
}

const HOURS_NOTE_MAX_LENGTH = 100;
const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAY_BY_KOREAN = { 월: "mon", 화: "tue", 수: "wed", 목: "thu", 금: "fri", 토: "sat", 일: "sun" };

function padTime(hour, minute) {
  const h = Number(hour);
  if (!Number.isInteger(h) || h < 0 || h > 23) return null;
  return `${String(h).padStart(2, "0")}:${minute}`;
}

/**
 * 운영시간 원문 → 제안 값.
 *
 * **아주 좁은 경우에만 제안한다.** 시간 구간이 정확히 하나이고, 요일별로 다르다는 표시가
 * 없고, 휴무 표기를 요일로 읽을 수 있을 때다. 그 밖에는 제안하지 않는다 —
 * `Place.hours`는 자유 텍스트를 담지 못하고, 잘못 채우면 닫힌 날에 열려 있다고 말한다.
 */
export function buildOperatingHoursReview(introItem, fieldNames) {
  // 운영시간 필드가 아예 없는 타입이 있다(숙박 32 — 입실·퇴실만 있다).
  if (!fieldNames.hours) {
    return {
      raw: {},
      proposal: null,
      reason: "이 관광타입에는 운영시간 필드가 없다. 입실·퇴실 시각을 영업시간으로 쓰지 않는다.",
    };
  }
  const openText = text(introItem?.[fieldNames.hours]);
  let restText = fieldNames.restDate ? text(introItem?.[fieldNames.restDate]) : "";
  const raw = {
    [fieldNames.hours]: openText,
    ...(fieldNames.restDate ? { [fieldNames.restDate]: restText } : {}),
    [fieldNames.parking]: text(introItem?.[fieldNames.parking]),
    [fieldNames.inquiry]: text(introItem?.[fieldNames.inquiry]),
  };
  const reject = (reason) => ({ raw, proposal: null, reason });

  if (!openText) return reject("운영시간이 미제공이다. 빈 값은 휴무가 아니다.");

  const ranges = [...openText.matchAll(/(\d{1,2}):([0-5]\d)\s*[-~–]\s*(\d{1,2}):([0-5]\d)/g)];
  if (ranges.length !== 1) {
    return reject(
      ranges.length === 0
        ? "시간 구간을 찾지 못했다. 자유 텍스트라 Place.hours 형식으로 옮길 수 없다."
        : `시간 구간이 ${ranges.length}개다. 요일·시설별로 달라 한 벌의 운영시간으로 옮길 수 없다.`,
    );
  }
  if (/[월화수목금토일]요일/.test(openText)) {
    return reject("운영시간 문장에 요일이 섞여 있다. 요일별 차이를 사람이 읽어야 한다.");
  }
  // **계절 운영기간을 연중 시간표로 만들지 않는다.** 옥천군 반려동물 놀이터는
  // `"운영기간: 3월~11월"`이라 12~2월은 닫는데, 시간 구간 하나만 보고 제안하면
  // 겨울에도 여는 것처럼 저장된다. 기간·계절을 말하는 문장이 있으면 사람이 읽는다.
  if (/운영기간|하절기|동절기|성수기|비수기|\d+월/.test(openText)) {
    return reject("운영 기간·계절이 함께 적혀 있다. 요일별 시간표로는 기간을 표현할 수 없다.");
  }

  const [, openHour, openMinute, closeHour, closeMinute] = ranges[0];
  const open = padTime(openHour, openMinute);
  const close = padTime(closeHour, closeMinute);
  if (!open || !close || open >= close) {
    return reject("시간 값이 24시간 표기(HH:MM)로 떨어지지 않거나 여는 시각이 닫는 시각보다 늦다.");
  }

  let closedDays = [];
  if (restText && restText !== "연중무휴") {
    // `"월요일~금요일"`처럼 **요일 범위**로 적힌 휴무를 양끝만 읽으면 가운데 요일이
    // 열린 것으로 저장된다. 범위를 먼저 펼쳐 놓고 요일을 뽑는다.
    restText = restText.replace(
      /([월화수목금토일])요일\s*[~\-–]\s*([월화수목금토일])요일/g,
      (whole, from, to) => {
        const order = ["월", "화", "수", "목", "금", "토", "일"];
        const start = order.indexOf(from);
        const end = order.indexOf(to);
        if (start < 0 || end < 0) return whole;
        const span = [];
        for (let i = start; ; i = (i + 1) % order.length) {
          span.push(`${order[i]}요일`);
          if (i === end || span.length > order.length) break;
        }
        return span.join(" ");
      },
    );
    closedDays = [...new Set([...restText.matchAll(/([월화수목금토일])요일/g)].map((m) => DAY_BY_KOREAN[m[1]]))];
    if (closedDays.length === 0) {
      return reject(`휴무 표기 "${restText}"를 요일로 읽지 못했다. 열려 있다고 잘못 적을 수 있어 제안하지 않는다.`);
    }
  }

  const hours = Object.fromEntries(
    DAY_KEYS.map((day) => [day, closedDays.includes(day) ? null : { open, close }]),
  );
  // 괄호 안 단서(마지막 주문 등)는 hoursNote 한 줄로만 남긴다. 운영시간 본체를 대신하지 않는다.
  const note = openText.match(/\(([^)]{1,120})\)/)?.[1]?.trim() ?? null;
  return {
    raw,
    proposal: {
      hours,
      hoursNote: note && note.length <= HOURS_NOTE_MAX_LENGTH ? note : null,
      basis: `${fieldNames.hours}="${openText}" · ${fieldNames.restDate}="${restText || "미제공"}"`,
    },
    reason: null,
  };
}

/**
 * 문의처를 전화번호로 쓸 수 있는가.
 * `tel`이 전 건 비어 있어 `infocenterfood`가 유일한 연락처인데, 값에 안내 문구가 섞여
 * 여러 번호가 들어오는 경우가 있다. **번호 하나만 있을 때만** 후보에 넣는다.
 */
export function phoneFromInquiry(value) {
  const trimmed = text(value);
  if (!trimmed) return null;
  return /^0\d{1,3}-\d{3,4}-\d{4}$/.test(trimmed) ? trimmed : null;
}

const PARKING_NOTE_MAX_LENGTH = 100;

/**
 * 주차 원문 → `Place.parking` 제안.
 *
 * 실측값은 `"가능"` · `"불가능"` · `"가능
요금 (무료)"` 꼴이다. **맨 앞 낱말로만** 판단하고
 * 나머지는 메모로 넘긴다. `"주차 무료"`를 반려견 추가요금 무료로 읽지 않는다 —
 * 여기서 만드는 값은 `Place.parking`뿐이고 `policyDetails.admission`에 닿지 않는다.
 */
export function buildParkingReview(introItem, fieldNames) {
  const raw = decodeApiText(introItem?.[fieldNames.parking]);
  if (!raw) {
    return { raw: "", proposal: null, reason: "주차 정보가 미제공이다. 빈 값은 주차 불가가 아니다." };
  }
  // "불가능"이 "가능"을 포함하므로 부정을 먼저 본다.
  const availability = /^불가/.test(raw) ? "UNAVAILABLE" : /^가능/.test(raw) ? "AVAILABLE" : null;
  if (availability == null) {
    return {
      raw,
      proposal: null,
      reason: `주차 안내 "${raw}"를 가능/불가로 읽지 못했다. 사람이 확인해야 한다.`,
    };
  }
  const rest = raw.replace(/^(불가능|불가|가능)/, "").trim();
  return {
    raw,
    proposal: {
      parking: availability,
      // 메모는 그대로 옮기지 않는다 — 화면에 그대로 나가는 칸이라 한국어 원문을 넣지 않는다.
      parkingNote: null,
      parkingNoteSource: rest && rest.length <= PARKING_NOTE_MAX_LENGTH ? rest : null,
      basis: `${fieldNames.parking}="${raw.replace(/\n/g, " ")}"`,
    },
    reason: null,
  };
}

/**
 * 장소 소개 원문 → `Place.descriptionKr` 제안.
 *
 * **가져오기가 저장하지 않는다.** 관광공사 콘텐츠는 이용 조건이 붙는 저작물이고,
 * 이 프로젝트는 이미지에 대해서만 출처 기록(D-22)을 갖췄다. 글은 사람이 읽고
 * 직접 쓰거나 출처를 판단해 넣는다. 여기서는 원문을 검토 시트에 실어 주기만 한다.
 */
export function buildDescriptionReview(commonItem) {
  const raw = decodeApiText(commonItem?.overview);
  if (!raw) return { raw: "", proposal: null, reason: "장소 소개가 미제공이다." };
  return {
    raw,
    proposal: {
      target: "Place.descriptionKr",
      lengthChars: raw.length,
      basis: "detailCommon2.overview (한국어 원문)",
    },
    reason: null,
  };
}

const USAGE_GUIDE_MAX_LENGTH = 2000;

/**
 * 운영·이용 안내 원문을 **범위를 지우지 않고** 한 덩이로 모은다.
 *
 * `Place.hours`는 장소 전체의 요일별 시간만 담는다. 계절별(`하절기/동절기`),
 * 시설별(`출렁다리`·`숙박 입실`), `"상시 개방"`, 복잡한 휴무 규칙은 거기에 들어갈 수 없고,
 * 억지로 넣으면 **출렁다리 운영시간이 휴양림 전체 시간**이 된다. 그래서 원문을 라벨과 함께
 * 통째로 남긴다. 사람이 읽고 필요하면 영어로 옮긴다(`usageGuideEn`).
 *
 * 구조화된 `hours`가 이미 같은 내용을 담았으면 운영시간 줄은 넣지 않는다 — 같은 말을
 * 두 번 보여줄 이유가 없다. 원문에 시간 말고 다른 단서가 붙어 있으면 그건 남긴다.
 */
export function buildUsageGuide(introItem, fieldNames, hoursProposal) {
  const hoursText = fieldNames.hours ? decodeApiText(introItem?.[fieldNames.hours]) : "";
  const restText = fieldNames.restDate ? decodeApiText(introItem?.[fieldNames.restDate]) : "";
  const parkingText = decodeApiText(introItem?.[fieldNames.parking]);
  // 입실·퇴실은 운영시간이 아니다. 라벨을 붙여 안내로만 남긴다.
  const checkIn = fieldNames.checkIn ? decodeApiText(introItem?.[fieldNames.checkIn]) : "";
  const checkOut = fieldNames.checkOut ? decodeApiText(introItem?.[fieldNames.checkOut]) : "";

  const lines = [];
  if (hoursText) {
    const covered =
      hoursProposal != null &&
      hoursText.replace(/(\d{1,2}:[0-5]\d)\s*[-~–]\s*(\d{1,2}:[0-5]\d)/, "").replace(/[\s\uFF5E~-]/g, "").trim() === "";
    if (!covered) lines.push(`[운영시간] ${hoursText}`);
  }
  if (restText) lines.push(`[휴무] ${restText}`);
  if (checkIn || checkOut) {
    lines.push(`[입실/퇴실] ${checkIn || "미제공"} / ${checkOut || "미제공"}`);
  }
  if (parkingText) lines.push(`[주차] ${parkingText}`);

  const guide = lines.join("\n");
  if (!guide) return { guide: null, reason: "운영·주차 안내가 모두 미제공이다." };
  if (guide.length > USAGE_GUIDE_MAX_LENGTH) {
    // 자르면 범위가 잘린 안내가 된다. 자르지 않고 사람에게 넘긴다.
    return { guide: null, reason: `안내 원문이 ${guide.length}자로 저장 한도(${USAGE_GUIDE_MAX_LENGTH}자)를 넘는다.` };
  }
  return { guide, reason: null };
}
