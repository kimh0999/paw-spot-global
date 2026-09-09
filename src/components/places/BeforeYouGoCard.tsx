import { getTranslations } from "next-intl/server";
import { Check, CircleAlert, CircleSlash, Info, TriangleAlert, type LucideIcon } from "lucide-react";

import { resolveDogAccess, type DogAccessKey } from "@/lib/places/dog-access";
import { showsVaccinationRow } from "@/lib/places/display";
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

interface Props {
  condition: PlaceDetail["condition"];
  locale: string;
}

// 조건 상태는 카드·미리보기와 같은 아이콘·색을 쓴다. 같은 사실이 화면마다 다른 모양이면
// 사용자는 둘을 다른 정보로 읽는다 (DESIGN.md §4 Icons·§9).
const statusIcons: Record<ConditionStatus, LucideIcon> = {
  good: Check,
  warning: CircleAlert,
  bad: CircleSlash,
  neutral: Info,
};

const statusColors: Record<ConditionStatus, string> = {
  good: "text-success",
  warning: "text-warning",
  bad: "text-danger",
  neutral: "text-content-muted",
};

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

  const none: { value: string; status: ConditionStatus } = {
    value: t("checkWithStore"),
    status: "neutral",
  };

  const conditionRows: Array<{ label: string; value: string; status: ConditionStatus }> = [];

  if (condition) {
    // 실내 조건 행은 요약 컬럼만으로 판단하지 않는다. 세부 정책의 구역 기록까지
    // 함께 읽어야 `실내 불가 · 야외 미확인`과 정보 불일치를 구분할 수 있다.
    const access = resolveDogAccess(condition.indoor, condition.policyDetails);
    const accessMap: Record<DogAccessKey, { value: string; status: ConditionStatus }> = {
      allowed: { value: t("indoor.allowed"), status: "good" },
      outdoorOnly: { value: t("indoor.outdoor_only"), status: "warning" },
      partialArea: { value: t("indoor.partial_area"), status: "warning" },
      notAllowed: { value: t("indoor.not_allowed"), status: "bad" },
      indoorBlockedOutdoorUnconfirmed: {
        value: t("indoor.indoorBlockedOutdoorUnconfirmed"),
        status: "warning",
      },
      conflict: { value: t("indoor.conflict"), status: "neutral" },
      unknown: { value: t("indoor.unknown"), status: "neutral" },
    };
    conditionRows.push({ label: t("indoor.label"), ...accessMap[access.key] });

    const carrierMap: Record<string, { value: string; status: ConditionStatus }> = {
      not_required: { value: t("carrier.not_required"), status: "good" },
      required_indoor: { value: t("carrier.required_indoor"), status: "warning" },
      required_always: { value: t("carrier.required_always"), status: "bad" },
      unknown: { value: t("carrier.unknown"), status: "neutral" },
    };
    conditionRows.push({
      label: t("carrier.label"),
      ...(carrierMap[condition.carrierStrollerPolicy ?? ""] ?? none),
    });

    /**
     * 최대 허용 크기는 **상한을 알려주는 사실**이지 그 자체로 좋고 나쁜 조건이 아니다.
     * 소형견 보호자에게 `소형견까지`는 통과이고, 대형견 보호자에게는 제한이다.
     * 반려견 기준 판정은 방문 가능 배너가 따로 하므로 여기서는 중립으로 둔다 —
     * 카드의 조건 요약도 이미 중립이라 두 화면이 같은 색으로 읽힌다.
     */
    const dogSizeMap: Record<string, string> = {
      small: t("dogSize.small"),
      medium: t("dogSize.medium"),
      large: t("dogSize.large"),
      unknown: t("dogSize.unknown"),
    };
    conditionRows.push({
      label: t("dogSize.label"),
      value: dogSizeMap[condition.maxDogSize ?? ""] ?? none.value,
      status: "neutral",
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
    // 확인되지 않은 증빙 조건은 행 자체를 만들지 않는다.
    if (showsVaccinationRow(condition.vaccinationCertificatePolicy)) {
      conditionRows.push({
        label: t("vaccination.label"),
        ...(vaccinationMap[condition.vaccinationCertificatePolicy ?? ""] ?? none),
      });
    }
  }

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
            라벨과 값을 두 컬럼으로 나눈다. 값이 배지 안에 들어가 있으면 조건마다 색 상자가
            늘어서서 어느 것이 제한인지 읽히지 않는다 — 상태는 아이콘과 색으로만 말한다.
          */}
          <dl className="divide-y divide-border">
            {conditionRows.map((row) => {
              const Icon = statusIcons[row.status];
              return (
                <div
                  key={row.label}
                  // 좁은 폭에서는 라벨을 값 위로 올린다. 두 컬럼을 유지하면 영어 조건 문장이
                  // 매번 두세 줄로 접힌다 — 조건은 줄이지 않고 폭을 주는 쪽을 택한다.
                  className="py-3 sm:grid sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-3"
                >
                  <dt className="text-xs text-content-secondary sm:text-sm">{row.label}</dt>
                  <dd className="mt-1 flex items-start gap-2 text-sm font-medium text-content sm:mt-0">
                    <Icon
                      size={16}
                      strokeWidth={2}
                      className={`mt-0.5 shrink-0 ${statusColors[row.status]}`}
                      aria-hidden="true"
                    />
                    <span className="min-w-0">{row.value}</span>
                  </dd>
                </div>
              );
            })}
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
            <dl className="mt-5 divide-y divide-border border-t border-border">
              {condition.requiredItems.length > 0 && (
                <div className="py-3 sm:grid sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-3">
                  <dt className="text-xs text-content-secondary sm:text-sm">
                    {t("requiredItems")}
                  </dt>
                  <dd className="mt-1 text-sm text-content sm:mt-0">
                    {condition.requiredItems
                      .map((item) => (item === "POOP_BAG" ? t("poopBag") : item))
                      .join(", ")}
                  </dd>
                </div>
              )}
              {condition.breedRestrictions && (
                <div className="py-3 sm:grid sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-3">
                  <dt className="text-xs text-content-secondary sm:text-sm">
                    {t("breedRestriction")}
                  </dt>
                  <dd className="mt-1 text-sm text-content sm:mt-0">
                    {condition.breedRestrictions}
                  </dd>
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
