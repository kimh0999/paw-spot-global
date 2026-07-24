import { getTranslations } from "next-intl/server";

import type { ConditionStatus, PlaceDetail } from "@/types/place";
import ConditionBadge from "./ConditionBadge";

interface Props {
  condition: PlaceDetail["condition"];
  locale: string;
}

export default async function BeforeYouGoCard({ condition, locale }: Props) {
  const t = await getTranslations({
    locale,
    namespace: "places.detail.beforeYouGo",
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
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 bg-gray-50/60 border-b border-gray-100">
        <h2 className="text-lg font-bold text-gray-900">{t("title")}</h2>
        <p className="text-sm text-gray-500 mt-0.5">{t("subtitle")}</p>
      </div>

      {!condition ? (
        <div className="px-5 py-8 text-center">
          <p className="text-sm text-gray-400">{t("noCondition")}</p>
        </div>
      ) : (
        <div className="px-5 py-4">
          <div className="divide-y divide-gray-50">
            {conditionRows.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between gap-4 py-3"
              >
                <span className="text-sm text-gray-500 shrink-0">{row.label}</span>
                <ConditionBadge label={row.value} status={row.status} />
              </div>
            ))}
          </div>

          {(condition.cautions ||
            condition.requiredItems.length > 0 ||
            condition.breedRestrictions) && (
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
              {condition.cautions && (
                <div className="bg-amber-50 rounded-xl px-4 py-3">
                  <p className="text-xs font-semibold text-amber-700 mb-1">
                    ⚠️ {t("cautions")}
                  </p>
                  <p className="text-sm text-amber-800 leading-relaxed">
                    {condition.cautions}
                  </p>
                </div>
              )}
              {condition.requiredItems.length > 0 && (
                <div className="flex items-start gap-3">
                  <span className="text-xs font-medium text-gray-400 shrink-0 pt-0.5 min-w-[80px]">
                    {t("requiredItems")}
                  </span>
                  <p className="text-sm text-gray-600">
                    {condition.requiredItems
                      .map((item) => (item === "POOP_BAG" ? t("poopBag") : item))
                      .join(", ")}
                  </p>
                </div>
              )}
              {condition.breedRestrictions && (
                <div className="flex items-start gap-3">
                  <span className="text-xs font-medium text-gray-400 shrink-0 pt-0.5 min-w-[80px]">
                    {t("breedRestriction")}
                  </span>
                  <p className="text-sm text-gray-600">{condition.breedRestrictions}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
