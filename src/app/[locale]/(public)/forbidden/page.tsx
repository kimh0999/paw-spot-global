import { getTranslations } from "next-intl/server";

import { signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { isSupportedLocale } from "@/lib/i18n/locale";

interface ForbiddenPageProps {
  params: Promise<{ locale: string }>;
}

export default async function ForbiddenPage({ params: paramsPromise }: ForbiddenPageProps) {
  // Next 15부터 params/searchParams는 Promise다. 기존 참조를 그대로 두기 위해 풀어서 같은 이름에 담는다.
  const params = await paramsPromise;
  const locale = isSupportedLocale(params.locale) ? params.locale : "en";
  const t = await getTranslations({ locale, namespace: "auth.forbidden" });
  const tAuth = await getTranslations({ locale, namespace: "auth" });

  async function logout() {
    "use server";

    await signOut({ redirectTo: `/${locale}/login` });
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-12">
      <section className="w-full rounded-card border border-border bg-surface p-8 text-center">
        <h1 className="text-2xl font-bold text-content">{t("title")}</h1>
        <p className="mt-2 text-sm text-content-secondary">{t("description")}</p>

        <div className="mt-6 flex justify-center gap-3">
          <Button asChild variant="outline">
            <Link href="/">{t("backHome")}</Link>
          </Button>
          <form action={logout}>
            <Button type="submit">{tAuth("logout")}</Button>
          </form>
        </div>
      </section>
    </main>
  );
}
