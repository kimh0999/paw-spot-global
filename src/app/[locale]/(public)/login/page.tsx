import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { auth, signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import {
  getDefaultAdminPath,
  getSafeCallbackUrl,
} from "@/lib/auth/safe-callback-url";
import { getCurrentAdmin } from "@/lib/auth/require-admin";
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
  const fallback = getDefaultAdminPath(locale);
  const callbackUrl = getSafeCallbackUrl(
    searchParams.callbackUrl,
    locale,
    fallback,
  );
  const session = await auth();
  const admin = await getCurrentAdmin();

  if (admin) {
    redirect(callbackUrl);
  }

  if (session?.user?.email) {
    redirect(`/${locale}/forbidden`);
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
      <section className="w-full rounded-xl border border-gray-100 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
        <p className="mt-2 text-sm text-gray-600">{t("description")}</p>

        {errorMessage && (
          <p className="mt-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
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
