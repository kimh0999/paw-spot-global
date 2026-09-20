import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { assertSupportedLocale } from "@/i18n/assert-locale";
import DocumentLocale from "@/components/i18n/DocumentLocale";
import SessionProvider from "@/components/providers/SessionProvider";
import { SUPPORTED_LOCALES } from "@/lib/constants";
import { isSupportedLocale } from "@/lib/i18n/locale";
import { siteOrigin } from "@/lib/seo/site";

/**
 * locale별 기본 metadata.
 *
 * **`alternates`는 여기에 두지 않는다.** 레이아웃의 `alternates`는 스스로 정의하지 않은
 * 하위 페이지가 전부 물려받아, 모든 경로가 `/` 를 정본으로 가리키게 된다. canonical과
 * hreflang은 경로를 아는 **각 페이지**가 직접 만든다.
 *
 * `og:image`는 넣지 않는다 — 이 저장소에 OG 이미지 파일이 없다. 없는 파일을 가리키면
 * 미리보기가 깨진 채로 공유된다.
 */
export async function generateMetadata({
  params: paramsPromise,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await paramsPromise;
  if (!isSupportedLocale(locale)) return {};

  const t = await getTranslations({ locale, namespace: "seo" });
  const siteName = t("siteName");

  return {
    metadataBase: new URL(siteOrigin()),
    title: {
      default: `${siteName} — ${t("home.title")}`,
      template: `%s · ${siteName}`,
    },
    description: t("home.description"),
    openGraph: {
      type: "website",
      siteName,
      locale,
      title: `${siteName} — ${t("home.title")}`,
      description: t("home.description"),
    },
    twitter: {
      card: "summary",
      title: `${siteName} — ${t("home.title")}`,
      description: t("home.description"),
    },
  };
}

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

/**
 * `generateStaticParams`가 준 값 외의 locale은 렌더하지 않는다.
 *
 * 프로덕션 빌드에서 이 세그먼트를 끊는 1차 방어선이다. **dev 서버에서는 적용되지 않으므로**
 * (dev는 모든 라우트를 동적으로 렌더한다) 아래 `assertSupportedLocale`이 두 환경 모두에서
 * 같은 결과를 만든다.
 */
export const dynamicParams = false;

export default async function LocaleLayout({
  children,
  params: paramsPromise,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  // Next 15부터 params/searchParams는 Promise다. 기존 참조를 그대로 두기 위해 풀어서 같은 이름에 담는다.
  const { locale } = await paramsPromise;

  // 지원하지 않는 locale은 여기서 404가 된다. 페이지의 조회까지 막는 것은 페이지 쪽 호출이다.
  assertSupportedLocale(locale);

  const messages = await getMessages();
  const session = await auth();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <DocumentLocale />
      <SessionProvider session={session}>{children}</SessionProvider>
    </NextIntlClientProvider>
  );
}
