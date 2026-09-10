import { getTranslations } from "next-intl/server";
import { TriangleAlert } from "lucide-react";

import ConditionStatusIcon from "@/components/places/ConditionStatusIcon";
import { buildConditionRows } from "@/lib/places/condition-rows";
import { toPolicyDisplay } from "@/lib/places/policy-display";
import {
  buildAdmissionSentences,
  buildBehaviorSentence,
  buildHandlingSentence,
  buildHygieneSentence,
  buildPreparationSentence,
  buildSpaceSentence,
  buildUncertaintySentence,
  type Translate,
} from "@/lib/places/policy-sentences";
import type { PlaceDetail } from "@/types/place";

interface Props {
  condition: PlaceDetail["condition"];
  locale: string;
}

/** 내용이 있을 때만 나타나는 항목 목록. 긴 안내문 대신 짧은 줄로 나눠 보여준다. */
function PolicyBlock({ title, lines }: { title: string; lines: string[] }) {
  if (lines.length === 0) return null;

  return (
    <div className="border-t border-border pt-4">
      <h3 className="text-xs font-bold uppercase tracking-wide text-content-muted">
        {title}
      </h3>
      <ul className="mt-2 space-y-1.5">
        {lines.map((line) => (
          <li key={line} className="flex gap-2 text-sm text-content-secondary">
            <span aria-hidden="true" className="text-content-muted">
              ·
            </span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function BeforeYouGoCard({ condition, locale }: Props) {
  const t = await getTranslations({
    locale,
    namespace: "places.detail.beforeYouGo",
  });
  const tp = await getTranslations({
    locale,
    namespace: "places.detail.policyDetails",
  });
  // 문장 조합은 순수 함수에 두고 여기서는 메시지 조회만 넘긴다.
  const translate: Translate = (key, values) => tp(key, values);

  // 구조화되지 않았거나 형식이 깨진 장소는 null이라 기존 조건 6행만 그대로 보인다.
  // 필요 준비물 줄이 이미 보여주는 항목은 문장으로 반복하지 않도록 함께 넘긴다.
  const policy = toPolicyDisplay(condition?.policyDetails ?? null, {
    requiredItems: condition?.requiredItems ?? [],
  });

  // 상단 요약과 같은 함수에서 만든다. 두 곳이 각자 해석하면 한 화면 안에서 말이 갈린다.
  const conditionRows = buildConditionRows(condition, t);

  return (
    <section aria-labelledby="before-you-go-title">
      <div className="border-b-2 border-content pb-3">
        <h2 id="before-you-go-title" className="text-xl font-bold text-content">
          {t("title")}
        </h2>
        <p className="mt-1 text-sm text-content-secondary">{t("subtitle")}</p>
      </div>

      {!condition ? (
        <p className="py-8 text-center text-sm text-content-muted">{t("noCondition")}</p>
      ) : (
        <>
          {/*
            조건은 **라벨 위·값 아래**의 칸으로 놓고 넓은 폭에서는 두 칸씩 나란히 둔다.
            라벨 열을 따로 세우면 값이 짧아 오른쪽이 길게 비고, 값을 배지로 감싸면 조건마다
            색 상자가 늘어서 어느 것이 제한인지 읽히지 않는다 — 상태는 아이콘과 색만 말한다.
          */}
          <dl className="grid border-t border-border sm:grid-cols-2 sm:gap-x-10">
            {conditionRows.map((row) => (
              <div key={row.key} className="border-b border-border py-3">
                <dt className="text-xs text-content-secondary">{row.label}</dt>
                <dd className="mt-1 flex items-start gap-2 text-sm font-medium text-content">
                  <ConditionStatusIcon status={row.status} className="mt-0.5" />
                  <span className="min-w-0">{row.value}</span>
                </dd>
              </div>
            ))}
          </dl>

          {condition.cautions && (
            <div className="mt-5 rounded-panel bg-warning-soft px-4 py-3">
              <p className="flex items-center gap-1.5 text-xs font-bold text-warning">
                <TriangleAlert className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" />
                {t("cautions")}
              </p>
              <p className="mt-1 whitespace-pre-line text-sm text-warning">
                {condition.cautions}
              </p>
            </div>
          )}

          {(condition.requiredItems.length > 0 || condition.breedRestrictions) && (
            <dl className="mt-5 grid border-t border-border sm:grid-cols-2 sm:gap-x-10">
              {condition.requiredItems.length > 0 && (
                <div className="border-b border-border py-3">
                  <dt className="text-xs text-content-secondary">{t("requiredItems")}</dt>
                  <dd className="mt-1 text-sm text-content">
                    {condition.requiredItems
                      .map((item) => (item === "POOP_BAG" ? t("poopBag") : item))
                      .join(", ")}
                  </dd>
                </div>
              )}
              {condition.breedRestrictions && (
                <div className="border-b border-border py-3">
                  <dt className="text-xs text-content-secondary">{t("breedRestriction")}</dt>
                  <dd className="mt-1 text-sm text-content">{condition.breedRestrictions}</dd>
                </div>
              )}
            </dl>
          )}

          {policy && (
            <div className="mt-6 space-y-4">
              {policy.entry && (
                <PolicyBlock
                  title={tp("entryTitle")}
                  lines={[tp(`entry.${policy.entry.policy}`)]}
                />
              )}
              <PolicyBlock
                title={tp("preparationTitle")}
                lines={policy.preparation.map((line) =>
                  buildPreparationSentence(line, translate, locale),
                )}
              />
              <PolicyBlock
                title={tp("handlingTitle")}
                lines={policy.handling.map((line) =>
                  buildHandlingSentence(line, translate, locale),
                )}
              />
              <PolicyBlock
                title={tp("spaceTitle")}
                lines={policy.spaceExceptions.map((line) =>
                  buildSpaceSentence(line, translate),
                )}
              />
              <PolicyBlock
                title={tp("behaviorTitle")}
                lines={policy.behaviorRestrictions.map((line) =>
                  buildBehaviorSentence(line, translate),
                )}
              />
              <PolicyBlock
                title={tp("admissionTitle")}
                lines={
                  policy.admission
                    ? buildAdmissionSentences(policy.admission, translate, locale)
                    : []
                }
              />
              <PolicyBlock
                title={tp("hygieneTitle")}
                lines={policy.hygiene.map((line) => buildHygieneSentence(line, translate))}
              />
              <PolicyBlock
                title={tp("uncertaintyTitle")}
                lines={policy.uncertainties.map((line) =>
                  buildUncertaintySentence(line, translate),
                )}
              />
            </div>
          )}
        </>
      )}
    </section>
  );
}
