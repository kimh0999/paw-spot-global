"use client";

import { useLocale, useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { formatDistance } from "@/lib/geo/distance";
import { isSupportedLocale } from "@/lib/i18n/locale";
import { groupConsecutiveDays } from "@/lib/places/operating-hours";
import type { VetClinicListItem } from "@/lib/vets/types";
import VetContactActions from "./VetContactActions";
import VetServiceBadge from "./VetServiceBadge";
import VetVerificationLine from "./VetVerificationLine";

/**
 * 목록의 병원 카드.
 *
 * 읽는 순서는 **병원명 → 구·주소·거리 → 안내된 시간 → 응대 조건 → 확인일 → 전화·지도**다.
 * 급하게 연락할 사람이 먼저 봐야 하는 것이 이름과 시간, 그리고 누를 것이 전화다.
 *
 * 사진 자리를 만들지 않는다 — 병원 선택에 사진은 필요 없고, 없는 자리를 무늬로 채우면
 * 카드마다 같은 면적이 낭비된다(DESIGN.md §2.1).
 */
interface Props {
  clinic: VetClinicListItem;
}

export default function VetClinicCard({ clinic }: Props) {
  const t = useTranslations("vets");
  const rawLocale = useLocale();
  const locale = isSupportedLocale(rawLocale) ? rawLocale : "en";

  // 영어 UI에서도 한국어 병원명을 함께 남긴다 — 전화로 병원명을 말해야 하기 때문이다.
  const primaryName = locale === "en" && clinic.nameEn ? clinic.nameEn : clinic.nameKr;
  const secondaryName = locale === "en" && clinic.nameEn ? clinic.nameKr : clinic.nameEn;

  const hourGroups = clinic.hours ? groupConsecutiveDays(clinic.hours) : [];
  const distanceText = formatDistance(clinic.distanceMeters, locale);

  return (
    <article className="relative rounded-card border border-border bg-surface p-4 transition-colors hover:border-border-strong">
      <h3 className="text-lg font-bold leading-snug tracking-tight text-content">
        <Link
          href={`/vets/${clinic.id}`}
          className="rounded-sm outline-none after:absolute after:inset-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {primaryName}
        </Link>
      </h3>
      {secondaryName && (
        <p lang={locale === "en" ? "ko" : "en"} className="mt-0.5 text-xs text-content-secondary">
          {secondaryName}
        </p>
      )}

      <p className="mt-1 text-xs text-content-secondary">
        {t(`district.${clinic.district}`)} · {clinic.address}
        {distanceText && <span className="ml-1 font-semibold text-content">{distanceText}</span>}
        {!clinic.location && <span className="ml-1"> · {t("card.noCoordinate")}</span>}
      </p>

      {/*
        안내된 시간. 없으면 "휴무"가 아니라 "안내된 진료시간 없음"이다.

        단, 시간표가 없어도 `hoursNote`에 안내가 있으면 `없음`이라고 말하지 않는다.
        기록에 시간 안내가 있는데 카드가 없다고 단언하면, 목록을 훑는 사람은 실제로는
        시간이 안내된 병원을 걸러 버린다.
      */}
      <div className="mt-3 text-sm">
        <p className="text-content-secondary">{t("hours.title")}</p>
        {hourGroups.length > 0 ? (
          <ul className="mt-0.5 space-y-0.5 text-content">
            {hourGroups.map((group) => (
              <li key={group.days.join("-")} className="flex gap-2">
                <span className="w-16 shrink-0 text-content-secondary">
                  {group.days.length > 1
                    ? `${t(`hours.days.${group.days[0]}`)}–${t(`hours.days.${group.days[group.days.length - 1]}`)}`
                    : t(`hours.days.${group.days[0]}`)}
                </span>
                <span className="tabular-nums">
                  {group.hours ? `${group.hours.open}–${group.hours.close}` : t("hours.closed")}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          !clinic.hoursNote && <p className="mt-0.5 text-content">{t("hours.none")}</p>
        )}
        {clinic.hoursNote && <p className="mt-0.5 text-content">{clinic.hoursNote}</p>}
      </div>

      <div className="mt-3 space-y-1.5">
        <VetServiceBadge
          label={t("service.englishLabel")}
          status={clinic.englishSupport}
          statusLabel={t(`service.${clinic.englishSupport}`)}
          condition={clinic.englishSupportCondition}
        />
        <VetServiceBadge
          label={t("service.afterHoursLabel")}
          status={clinic.afterHours}
          statusLabel={t(`service.${clinic.afterHours}`)}
          condition={clinic.afterHoursCondition}
        />
      </div>

      <div className="mt-3 border-t border-border pt-2.5">
        <VetVerificationLine item={clinic.verification.basic} />
      </div>

      {/* 링크 오버레이 위로 올려 카드 전체 링크와 클릭이 겹치지 않게 한다. */}
      <div className="relative z-10 mt-3">
        <VetContactActions
          name={clinic.nameKr}
          phone={clinic.phone}
          address={clinic.address}
          location={clinic.location}
        />
      </div>
    </article>
  );
}
