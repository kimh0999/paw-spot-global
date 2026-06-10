import { getDefaultAdminPath } from "@/lib/auth/safe-callback-url";
import { requireAdminPage } from "@/lib/auth/require-admin";
import { isSupportedLocale } from "@/lib/i18n/locale";

interface AdminLayoutProps {
  children: React.ReactNode;
  params: { locale: string };
}

export default async function AdminLayout({
  children,
  params,
}: AdminLayoutProps) {
  const locale = isSupportedLocale(params.locale) ? params.locale : "en";

  await requireAdminPage(locale, getDefaultAdminPath(locale));

  return children;
}
