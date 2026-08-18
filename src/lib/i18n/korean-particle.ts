/**
 * 한국어 조사 선택.
 *
 * 사용자가 지은 반려견 이름은 번역 대상이 아니라서 메시지 안에 그대로 들어간다.
 * 이름 끝 글자의 받침에 따라 조사가 달라지므로, 두 형태를 괄호로 함께 적는 대신 여기서 고른다.
 */

const HANGUL_SYLLABLE_START = 0xac00;
const HANGUL_SYLLABLE_END = 0xd7a3;
/** 한글 음절 한 세트는 종성 28개(받침 없음 포함)로 끝난다. */
const FINAL_CONSONANT_COUNT = 28;

/**
 * 끝 글자에 받침이 있으면 true, 없으면 false.
 * 영문·숫자·이모지처럼 판단할 수 없으면 null을 돌려주고 호출한 쪽에서 기본형을 쓴다.
 */
export function hasFinalConsonant(value: string): boolean | null {
  const last = value.trim().slice(-1);
  if (!last) return null;

  const code = last.codePointAt(0);
  if (
    code === undefined ||
    code < HANGUL_SYLLABLE_START ||
    code > HANGUL_SYLLABLE_END
  ) {
    return null;
  }

  return (code - HANGUL_SYLLABLE_START) % FINAL_CONSONANT_COUNT !== 0;
}

/** 목적격 조사: 별이 → 를, 검증견 → 을. 판단할 수 없으면 받침 없는 형태를 쓴다. */
export function objectParticle(name: string): "을" | "를" {
  return hasFinalConsonant(name) === true ? "을" : "를";
}

/** 공동격 조사: 별이 → 와, 검증견 → 과. 판단할 수 없으면 받침 없는 형태를 쓴다. */
export function comitativeParticle(name: string): "와" | "과" {
  return hasFinalConsonant(name) === true ? "과" : "와";
}
