import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { auth } from "@/auth";
import { assertSupportedLocale } from "@/i18n/assert-locale";
import DocumentLocale from "@/components/i18n/DocumentLocale";
import SessionProvider from "@/components/providers/SessionProvider";
import { SUPPORTED_LOCALES } from "@/lib/constants";

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
