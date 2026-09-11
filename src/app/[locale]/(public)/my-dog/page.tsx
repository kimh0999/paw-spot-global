import { redirect } from "next/navigation";

import { isSupportedLocale } from "@/lib/i18n/locale";

interface MyDogPageProps {
  params: Promise<{ locale: string }>;
}

/**
 * 반려견 관리 화면이 /profile/dogs로 옮겨갔다.
 * 헤더 밖에서 걸린 기존 링크와 북마크가 깨지지 않도록 경로만 넘겨준다.
 */
export default async function MyDogPage({ params: paramsPromise }: MyDogPageProps) {
  // Next 15부터 params/searchParams는 Promise다. 기존 참조를 그대로 두기 위해 풀어서 같은 이름에 담는다.
  const params = await paramsPromise;
  const locale = isSupportedLocale(params.locale) ? params.locale : "en";
  redirect(`/${locale}/profile/dogs`);
}
