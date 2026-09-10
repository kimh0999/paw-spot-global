import { getTranslations } from "next-intl/server";
import { ArrowLeft, Globe, MapPin } from "lucide-react";

import KoreanInquiryPhrases from "@/components/vets/KoreanInquiryPhrases";
import VetContactActions from "@/components/vets/VetContactActions";
import VetServiceBadge from "@/components/vets/VetServiceBadge";
import VetVerificationLine from "@/components/vets/VetVerificationLine";
import { Link } from "@/i18n/navigation";
import type { SupportedLocale } from "@/lib/constants";
import { groupConsecutiveDays } from "@/lib/places/operating-hours";
import { VET_VERIFICATION_TARGETS } from "@/lib/vets/constants";
import type { VetClinicDetail } from "@/lib/vets/types";

/**
 * 병원 상세 본문.
 *
 * 라우트에서 떼어 둔 이유는 **검증 때문**이다. 마이그레이션을 운영 DB에 적용하지 않아
 * 실데이터로 상세를 열 수 없으므로, 고정 데이터를 넣은 화면이 실제 페이지와 **같은 뷰**를
 * 그려야 검증이 의미를 갖는다. 조회는 라우트가, 표현은 여기가 맡는다.
 */
export default async function VetClinicDetailView({
  clinic,
  locale,
}: {
  clinic: VetClinicDetail;
  locale: SupportedLocale;
}) {
  const t = await getTranslations({ locale, namespace: "vets" });

  const primaryName = locale === "en" && clinic.nameEn ? clinic.nameEn : clinic.nameKr;
  const secondaryName = locale === "en" && clinic.nameEn ? clinic.nameKr : clinic.nameEn;
  const hourGroups = clinic.hours ? groupConsecutiveDays(clinic.hours) : [];

  const itemByTarget = {
    BASIC: clinic.verification.basic,
    HOURS: clinic.verification.hours,
    ENGLISH_SUPPORT: clinic.verification.englishSupport,
    AFTER_HOURS: clinic.verification.afterHours,
  } as const;

  return (
    <>
      {/* 하단 고정 바가 본문 끝을 가리지 않도록 여백을 준다 */}
      <main id="main-content" tabIndex={-1} className="bg-surface-page pb-40 lg:pb-16">
        <div className="mx-auto max-w-[720px] px-4 py-5 sm:px-6">
          <Link
            href="/vets"
            className="inline-flex h-11 items-center gap-1.5 rounded-md text-sm font-semibold text-content-secondary outline-none transition-colors hover:text-content focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
            {t("detail.back")}
          </Link>

          <div className="mt-2 rounded-card border border-border bg-surface p-5">
            <h1 className="text-2xl font-bold leading-tight tracking-tight text-content">
              {primaryName}
            </h1>
            {secondaryName && (
              <p
                lang={locale === "en" ? "ko" : "en"}
                className="mt-1 text-sm text-content-secondary"
              >
                {secondaryName}
              </p>
            )}

            <p className="mt-3 flex items-start gap-1.5 text-sm text-content-secondary">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" />
              <span>
                {t(`district.${clinic.district}`)} · {clinic.address}
              </span>
            </p>

            {/* 데스크톱에서는 여기서 바로 연락한다. 모바일은 하단 고정 바를 함께 둔다. */}
            <div className="mt-4 hidden lg:block">
              <VetContactActions
                name={clinic.nameKr}
                phone={clinic.phone}
                address={clinic.address}
                location={clinic.location}
              />
            </div>
          </div>

          <section className="mt-4 rounded-card border border-border bg-surface p-5">
            <h2 className="text-base font-bold text-content">{t("hours.title")}</h2>
            {hourGroups.length > 0 ? (
              <dl className="mt-2 space-y-1">
                {hourGroups.map((group) => (
                  <div key={group.days.join("-")} className="flex gap-3 text-sm">
                    <dt className="w-20 shrink-0 text-content-secondary">
                      {group.days.length > 1
                        ? `${t(`hours.days.${group.days[0]}`)}–${t(`hours.days.${group.days[group.days.length - 1]}`)}`
                        : t(`hours.days.${group.days[0]}`)}
                    </dt>
                    <dd className="tabular-nums text-content">
                      {group.hours
                        ? `${group.hours.open}–${group.hours.close}`
                        : t("hours.closed")}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <div className="mt-2">
                <p className="text-sm text-content">{t("hours.none")}</p>
                {/* 미등록을 휴무로 바꾸지 않는다 */}
                <p className="mt-0.5 text-xs text-content-secondary">{t("hours.noneHelp")}</p>
              </div>
            )}
            {clinic.hoursNote && (
              <p className="mt-2 text-xs text-content-secondary">{clinic.hoursNote}</p>
            )}
            <p className="mt-3 border-t border-border pt-2.5 text-xs text-content-muted">
              {t("hours.checkByPhone")}
            </p>
          </section>

          <section className="mt-4 space-y-3 rounded-card border border-border bg-surface p-5">
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
            {clinic.website && (
              <a
                href={clinic.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-sm text-sm font-semibold text-primary outline-none hover:text-primary-hover focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Globe size={16} strokeWidth={2} aria-hidden="true" />
                {t("detail.website")}
              </a>
            )}
          </section>

          {/* 항목별 확인 근거 — 무엇을 언제 어떻게 확인했는지 항목마다 따로 말한다 */}
          <section className="mt-4 rounded-card border border-border bg-surface p-5">
            <h2 className="text-base font-bold text-content">{t("verification.title")}</h2>
            <ul className="mt-2 space-y-1.5">
              {VET_VERIFICATION_TARGETS.map((target) => (
                <li key={target}>
                  <VetVerificationLine
                    item={itemByTarget[target]}
                    label={t(`verification.targets.${target}`)}
                  />
                </li>
              ))}
            </ul>
            <div className="mt-3 space-y-0.5 border-t border-border pt-2.5 text-xs text-content-muted">
              {clinic.collectedAt && (
                <p>
                  {t("verification.collectedAt", {
                    date: clinic.collectedAt.slice(0, 10),
                  })}
                </p>
              )}
              <p>{t("verification.updatedAt", { date: clinic.updatedAt.slice(0, 10) })}</p>
            </div>
          </section>

          <div className="mt-4">
            <KoreanInquiryPhrases />
          </div>

          <p className="mt-6 text-xs text-content-muted">{t("detail.disclaimer")}</p>
        </div>
      </main>

      {/*
        모바일 고정 연락 바. `env(safe-area-inset-bottom)`으로 홈 인디케이터를 피하고,
        본문에는 `pb-40`을 주어 마지막 문단이 가려지지 않게 한다.
      */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] lg:hidden">
        <VetContactActions
          name={clinic.nameKr}
          phone={clinic.phone}
          address={clinic.address}
          location={clinic.location}
          size="full"
        />
      </div>
    </>
  );
}
