import { comitativeParticle, objectParticle } from "@/lib/i18n/korean-particle";
import type {
  PolicyHandlingLine,
  PolicyPreparationLine,
  PolicyRelation,
  PolicyUncertaintyLine,
} from "@/lib/places/policy-display";

/**
 * 표시 항목을 각 언어의 문장으로 조합한다.
 *
 * 무엇을 보여줄지는 policy-display.ts가 정하고, 여기서는 그 결과에 언어별 표현만 입힌다.
 * 연결 표현이 코드에 있는 이유는 한국어 조사와 영어 접속사가 메시지 문자열 하나로
 * 담기지 않기 때문이다.
 */

/**
 * 번역된 항목 **이름**들을 한 구절로 잇는다.
 *
 * 연결 표현이 코드에 있는 이유: 한국어는 앞 단어 받침에 따라 `와/과`가 갈리고 영어는
 * 목록 위치에 따라 접속사가 달라져서, 메시지 문자열 하나로는 두 언어를 다 담을 수 없다.
 * 관계가 확인되지 않았으면 나열만 하고 `모두`나 `하나`로 추측하지 않는다.
 */
export function joinPolicyItems(
  labels: string[],
  relation: PolicyRelation,
  locale: string,
): string {
  if (labels.length === 0) return "";
  if (labels.length === 1) return labels[0];

  const head = labels.slice(0, -1).join(", ");
  const tail = labels[labels.length - 1];

  if (locale === "ko") {
    if (relation === "anyOf") return `${labels.join(" 또는 ")} 중 하나`;
    if (relation === "allOf") {
      return labels.length === 2
        ? `${labels[0]}${comitativeParticle(labels[0])} ${labels[1]} 모두`
        : `${labels.join(", ")} 모두`;
    }
    // 관계 미확인: 나열만 한다.
    return labels.length === 2
      ? `${labels[0]}${comitativeParticle(labels[0])} ${labels[1]}`
      : labels.join(", ");
  }

  if (relation === "anyOf") return `either ${head} or ${tail}`;
  if (relation === "allOf") return `both ${head} and ${tail}`;
  return `${head} and ${tail}`;
}

/**
 * 번역된 **서술 구절**들을 잇는다.
 *
 * 매장 내 상태는 "안고 있어야 합니다"처럼 동사로 끝나야 자연스러워서, 이름 목록과 다른
 * 방식으로 붙인다. 한국어는 앞 구절에 연결 어미를 붙이고 마지막 구절만 서술 어미를 받는다.
 * 관계가 확인되지 않은 경우는 여기로 오지 않는다 — 그때는 이름 목록으로 나열한다.
 */
export function joinHandlingClauses(
  labels: string[],
  relation: PolicyRelation,
  locale: string,
): string {
  if (labels.length === 0) return "";
  if (labels.length === 1) return labels[0];

  if (locale === "ko") {
    return labels.join(relation === "anyOf" ? "야 하거나 " : "야 하고 ");
  }

  const head = labels.slice(0, -1).join(", ");
  const tail = labels[labels.length - 1];
  return relation === "anyOf" ? `either ${head} or ${tail}` : `${head} and ${tail}`;
}

/**
 * 한국어 목적격 조사를 붙인다. 영어는 그대로 둔다.
 * 준비물 문구가 "…를 반드시 챙겨야 합니다" 형태라 구절 끝 받침에 따라 조사가 달라진다.
 */
export function appendObjectParticle(phrase: string, locale: string): string {
  if (locale !== "ko" || phrase.length === 0) return phrase;
  return `${phrase}${objectParticle(phrase)}`;
}

/** 메시지 조회 함수. 컴포넌트의 next-intl 번역기를 그대로 받아 쓴다. */
export type Translate = (key: string, values?: Record<string, string>) => string;

/** 관계가 확인되지 않았고 항목이 둘 이상이면 무엇이 필요한지 단정할 수 없다. */
function relationIsUnclear(relation: PolicyRelation, count: number): boolean {
  return relation === "unknown" && count > 1;
}

/**
 * 준비물 한 줄을 문장으로.
 * 관계를 모르면 요구 수준을 단정하는 문장 대신 "확인이 필요하다"고 말한다 —
 * "목줄, 케이지를 반드시 챙겨야 합니다"는 둘 다 필수라는 뜻이 되어 버린다.
 */
export function buildPreparationSentence(
  line: PolicyPreparationLine,
  t: Translate,
  locale: string,
): string {
  const labels = line.itemKeys.map((key) => t(`items.${key}`));

  const relation = relationIsUnclear(line.relation, line.itemKeys.length)
    ? "unknown"
    : line.relation;
  const items = appendObjectParticle(joinPolicyItems(labels, relation, locale), locale);

  let text =
    relation === "unknown" && line.itemKeys.length > 1
      ? t("preparation.relationUnknown", { items })
      : t(`preparation.${line.status}`, { items });

  if (line.indoorOnly) text = t("indoorOnly", { text });
  if (line.scopeUnknown) text = t("scopeUnknownNote", { text });
  return text;
}

/** 매장 내 상태 한 줄을 문장으로. 관계를 모르면 이름으로 나열하고 단정하지 않는다. */
export function buildHandlingSentence(
  line: PolicyHandlingLine,
  t: Translate,
  locale: string,
): string {
  if (relationIsUnclear(line.relation, line.ruleKeys.length)) {
    // 무엇을 지킬지 고르는 문제가 아니라 모두인지 하나인지가 확인되지 않은 것이다.
    const names = line.ruleKeys.map((key) => t(`rules.${key}`));
    return t("handling.relationUnknown", {
      items: appendObjectParticle(joinPolicyItems(names, "unknown", locale), locale),
    });
  }

  const clauses = line.ruleKeys.map((key) => t(`ruleClauses.${key}`));
  return t(`handling.${line.status}`, {
    items: joinHandlingClauses(clauses, line.relation, locale),
  });
}

/**
 * 확인이 필요한 항목 한 줄.
 *
 * 대상 코드로만 문장을 만든다. 관리자가 남긴 질문은 한 언어로만 작성돼 있어 반대 언어
 * 화면에 그대로 내보내면 읽을 수 없다. 그 질문은 운영 기록으로 DB에만 남는다.
 */
export function buildUncertaintySentence(
  line: PolicyUncertaintyLine,
  t: Translate,
): string {
  return t("uncertainty.default", { target: t(`targets.${line.targetKey}`) });
}
