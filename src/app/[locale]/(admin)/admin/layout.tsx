import { getDefaultAdminPath } from "@/lib/auth/safe-callback-url";
import { requireAdminPage } from "@/lib/auth/require-admin";
import { isSupportedLocale } from "@/lib/i18n/locale";
import { noIndexMetadata } from "@/lib/seo/page-metadata";

interface AdminLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}


/** 검색 결과에 뜰 이유가 없는 화면. 표시 정책일 뿐이고 권한은 기존 인증·인가가 맡는다. */
export const metadata = noIndexMetadata;

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
