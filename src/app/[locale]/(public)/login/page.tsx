import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { auth, signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import { getSafeCallbackUrl } from "@/lib/auth/safe-callback-url";
import { isSupportedLocale } from "@/lib/i18n/locale";

interface LoginPageProps {
  params: { locale: string };
  searchParams: {
    callbackUrl?: string | string[];
    error?: string | string[];
  };
}

export default async function LoginPage({
  params,
  searchParams,
}: LoginPageProps) {
  const locale = isSupportedLocale(params.locale) ? params.locale : "en";
  const t = await getTranslations({ locale, namespace: "auth.login" });
  const fallback = `/${locale}`;
  const callbackUrl = getSafeCallbackUrl(
    searchParams.callbackUrl,
    locale,
    fallback,
  );
  const session = await auth();

  if (session?.user?.email) {
    redirect(callbackUrl);
  }

  const error = Array.isArray(searchParams.error)
    ? searchParams.error[0]
    : searchParams.error;

  const errorMessage =
    error === "AccessDenied"
      ? t("accessDenied")
      : error === "Configuration"
        ? t("configurationError")
        : error
          ? t("loginFailed")
          : null;

  async function loginWithGoogle() {
    "use server";

    const safeRedirect = getSafeCallbackUrl(callbackUrl, locale, fallback);
    await signIn("google", { redirectTo: safeRedirect });
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-12">
      <section className="w-full rounded-card border border-border bg-surface p-8">
        <h1 className="text-2xl font-bold text-content">{t("title")}</h1>
        <p className="mt-2 text-sm text-content-secondary">{t("description")}</p>

        {errorMessage && (
          <p className="mt-6 rounded-lg border border-border bg-danger-soft p-3 text-sm text-danger">
            {errorMessage}
          </p>
        )}

        <form action={loginWithGoogle} className="mt-6">
          <Button type="submit" size="lg" className="w-full">
            {t("google")}
          </Button>
        </form>
      </section>
    </main>
  );
}
