import { getDefaultAdminPath } from "@/lib/auth/safe-callback-url";
import { requireAdminPage } from "@/lib/auth/require-admin";
import { isSupportedLocale } from "@/lib/i18n/locale";

interface AdminLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function AdminLayout({
  children,
  params: paramsPromise,
}: AdminLayoutProps) {
  // Next 15부터 params/searchParams는 Promise다. 기존 참조를 그대로 두기 위해 풀어서 같은 이름에 담는다.
  const params = await paramsPromise;
  const locale = isSupportedLocale(params.locale) ? params.locale : "en";

  await requireAdminPage(locale, getDefaultAdminPath(locale));

  return children;
}
