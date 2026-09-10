import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { auth } from "@/auth";
import DocumentLocale from "@/components/i18n/DocumentLocale";
import SessionProvider from "@/components/providers/SessionProvider";
import { SUPPORTED_LOCALES } from "@/lib/constants";

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const messages = await getMessages();
  const session = await auth();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <DocumentLocale />
      <SessionProvider session={session}>{children}</SessionProvider>
    </NextIntlClientProvider>
  );
}
