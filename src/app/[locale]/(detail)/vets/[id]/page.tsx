import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import Header from "@/components/Header";
import JsonLd from "@/components/seo/JsonLd";
import VetClinicDetailView from "@/components/vets/VetClinicDetailView";
import { isSupportedLocale } from "@/lib/i18n/locale";
import { noIndexMetadata } from "@/lib/seo/page-metadata";
import { absoluteUrl, alternatesFor } from "@/lib/seo/site";
import { vetClinicJsonLd } from "@/lib/seo/structured-data";
import { getPublicVetClinicById } from "@/lib/vets/queries";

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

/** 병원 이름은 locale에 맞게 고른다. 영문명이 없으면 한국어명을 그대로 쓴다 — 번역하지 않는다. */
function clinicName(
  clinic: { nameKr: string; nameEn: string | null },
  locale: "en" | "ko",
): string {
  return locale === "en" ? clinic.nameEn || clinic.nameKr : clinic.nameKr;
}

/**
 * 상세 metadata.
 *
 * 조회는 화면과 **같은 함수**를 쓴다 — `VISIBLE`이 아닌 병원은 여기서도 null이라
 * 임시저장·숨김 병원의 이름이 metadata로 새어 나가지 않는다. 없으면 색인 대상이 아니다.
 */
export async function generateMetadata({
  params: paramsPromise,
}: Props): Promise<Metadata> {
  const params = await paramsPromise;
  if (!isSupportedLocale(params.locale)) return noIndexMetadata;

  const clinic = await getPublicVetClinicById(params.id, null);
  if (!clinic) return noIndexMetadata;

  const locale = params.locale;
  const t = await getTranslations({ locale, namespace: "seo" });
  const tv = await getTranslations({ locale, namespace: "vets" });
  const name = clinicName(clinic, locale);
  const path = `/vets/${clinic.id}`;

  const description = t("vetDetail.description", {
    name,
    district: tv(`district.${clinic.district}`),
  });

  return {
    title: name,
    description,
    alternates: alternatesFor(locale, path),
    openGraph: {
      type: "website",
      siteName: t("siteName"),
      locale,
      url: absoluteUrl(locale, path),
      title: `${name} · ${t("siteName")}`,
      description,
    },
    twitter: { card: "summary", title: `${name} · ${t("siteName")}`, description },
  };
}

/**
 * 병원 상세 (P0).
 *
 * `VISIBLE`이 아닌 병원은 조회가 null을 돌려준다 — 임시저장·숨김은 URL을 알아도 열리지 않는다.
 * 표현은 `VetClinicDetailView`가 맡는다.
 */
export default async function VetDetailPage({ params: paramsPromise }: Props) {
  // Next 15부터 params/searchParams는 Promise다. 기존 참조를 그대로 두기 위해 풀어서 같은 이름에 담는다.
  const params = await paramsPromise;
  const locale = isSupportedLocale(params.locale) ? params.locale : "en";
  const clinic = await getPublicVetClinicById(params.id, null);

  if (!clinic) notFound();

  return (
    <>
      <Header />
      <JsonLd
        data={vetClinicJsonLd({
          clinic,
          name: clinicName(clinic, locale),
          url: absoluteUrl(locale, `/vets/${clinic.id}`),
        })}
      />
      <VetClinicDetailView clinic={clinic} locale={locale} />
    </>
  );
}
