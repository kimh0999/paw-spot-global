import { getTranslations } from "next-intl/server";

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
import type { ConditionStatus, PlaceDetail } from "@/types/place";
import ConditionBadge from "./ConditionBadge";
import { TriangleAlert } from "lucide-react";

interface Props {
  condition: PlaceDetail["condition"];
  locale: string;
}

/** 내용이 있을 때만 나타나는 항목 목록. 긴 안내문 대신 짧은 줄로 나눠 보여준다. */
function PolicyBlock({ title, lines }: { title: string; lines: string[] }) {
  if (lines.length === 0) return null;

  return (
    <div className="mt-4 pt-4 border-t">
      <h3 className="text-xs font-semibold text-content-secondary">{title}</h3>
      <ul className="mt-2 space-y-1.5">
        {lines.map((line) => (
          <li key={line} className="flex gap-2 text-sm text-content-secondary">
            <span aria-hidden="true" className="text-content-muted">
              ·
            </span>
            <span className="leading-relaxed">{line}</span>
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

  const none: { value: string; status: ConditionStatus } = {
    value: t("checkWithStore"),
    status: "neutral",
  };

  const conditionRows: Array<{ label: string; value: string; status: ConditionStatus }> = [];

  if (condition) {
    const indoorMap: Record<string, { value: string; status: ConditionStatus }> = {
      allowed: { value: t("indoor.allowed"), status: "good" },
      outdoor_only: { value: t("indoor.outdoor_only"), status: "warning" },
      partial_area: { value: t("indoor.partial_area"), status: "warning" },
      not_allowed: { value: t("indoor.not_allowed"), status: "bad" },
    };
    conditionRows.push({
      label: t("indoor.label"),
      ...(indoorMap[condition.indoor ?? ""] ?? none),
    });

    const carrierMap: Record<string, { value: string; status: ConditionStatus }> = {
      not_required: { value: t("carrier.not_required"), status: "good" },
      required_indoor: { value: t("carrier.required_indoor"), status: "warning" },
      required_always: { value: t("carrier.required_always"), status: "bad" },
    };
    conditionRows.push({
      label: t("carrier.label"),
      ...(carrierMap[condition.carrierStrollerPolicy ?? ""] ?? none),
    });

    const dogSizeMap: Record<string, { value: string; status: ConditionStatus }> = {
      small: { value: t("dogSize.small"), status: "bad" },
      medium: { value: t("dogSize.medium"), status: "warning" },
      large: { value: t("dogSize.large"), status: "good" },
    };
    conditionRows.push({
      label: t("dogSize.label"),
      ...(dogSizeMap[condition.maxDogSize ?? ""] ?? none),
    });

    const leashMap: Record<string, { value: string; status: ConditionStatus }> = {
      required: { value: t("leash.required"), status: "warning" },
      not_required: { value: t("leash.not_required"), status: "good" },
      partial_area: { value: t("leash.partial_area"), status: "warning" },
    };
    conditionRows.push({
      label: t("leash.label"),
      ...(leashMap[condition.leash ?? ""] ?? none),
    });

    const muzzleMap: Record<string, { value: string; status: ConditionStatus }> = {
      required: { value: t("muzzle.required"), status: "bad" },
      not_required: { value: t("muzzle.not_required"), status: "good" },
      conditional: { value: t("muzzle.conditional"), status: "warning" },
    };
    conditionRows.push({
      label: t("muzzle.label"),
      ...(muzzleMap[condition.muzzle ?? ""] ?? none),
    });

    const vaccinationMap: Record<string, { value: string; status: ConditionStatus }> = {
      required: { value: t("vaccination.required"), status: "warning" },
      not_required: { value: t("vaccination.not_required"), status: "good" },
    };
    conditionRows.push({
      label: t("vaccination.label"),
      ...(vaccinationMap[condition.vaccinationCertificatePolicy ?? ""] ?? none),
    });
  }

  return (
    <div className="bg-surface rounded-2xl border shadow-sm overflow-hidden">
      <div className="px-5 py-4 bg-surface-subtle border-b">
        <h2 className="text-lg font-bold text-content">{t("title")}</h2>
        <p className="text-sm text-content-secondary mt-0.5">{t("subtitle")}</p>
      </div>

      {!condition ? (
        <div className="px-5 py-8 text-center">
          <p className="text-sm text-content-muted">{t("noCondition")}</p>
        </div>
      ) : (
        <div className="px-5 py-4">
          <div className="divide-y">
            {conditionRows.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between gap-4 py-3"
              >
                <span className="text-sm text-content-secondary shrink-0">{row.label}</span>
                <ConditionBadge label={row.value} status={row.status} />
              </div>
            ))}
          </div>

          {(condition.cautions ||
            condition.requiredItems.length > 0 ||
            condition.breedRestrictions) && (
            <div className="mt-4 pt-4 border-t space-y-3">
              {condition.cautions && (
                <div className="bg-warning-soft rounded-xl px-4 py-3">
                  <p className="flex items-center gap-1 text-xs font-semibold text-warning mb-1">
                    <TriangleAlert className="w-4 h-4 shrink-0" strokeWidth={2} aria-hidden="true" />
                    {t("cautions")}
                  </p>
                  <p className="text-sm text-warning leading-relaxed">
                    {condition.cautions}
                  </p>
                </div>
              )}
              {condition.requiredItems.length > 0 && (
                <div className="flex items-start gap-3">
                  <span className="text-xs font-medium text-content-secondary shrink-0 pt-0.5 min-w-[80px]">
                    {t("requiredItems")}
                  </span>
                  <p className="text-sm text-content-secondary">
                    {condition.requiredItems
                      .map((item) => (item === "POOP_BAG" ? t("poopBag") : item))
                      .join(", ")}
                  </p>
                </div>
              )}
              {condition.breedRestrictions && (
                <div className="flex items-start gap-3">
                  <span className="text-xs font-medium text-content-secondary shrink-0 pt-0.5 min-w-[80px]">
                    {t("breedRestriction")}
                  </span>
                  <p className="text-sm text-content-secondary">{condition.breedRestrictions}</p>
                </div>
              )}
            </div>
          )}

          {policy && (
            <>
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
            </>
          )}
        </div>
      )}
    </div>
  );
}
