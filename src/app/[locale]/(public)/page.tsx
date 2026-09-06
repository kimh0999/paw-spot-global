import { getTranslations } from "next-intl/server";
import Header from "@/components/Header";
import HeroSection from "@/components/home/HeroSection";
import CategorySection from "@/components/home/CategorySection";
import InfoSection from "@/components/home/InfoSection";
import RecentPlacesSection from "@/components/home/RecentPlacesSection";
import { getHomePlaces } from "@/lib/places/queries";

export default async function Home() {
  const t = await getTranslations("home");
  // 실패를 삼키면 "장소가 없음"과 구별되지 않는다. 오류 경계가 받아 다시 시도를 준다.
  const homePlaces = await getHomePlaces();

  return (
    <>
      <Header />
      <main>
        <HeroSection />
        <CategorySection />
        <InfoSection />
        <RecentPlacesSection places={homePlaces} />
      </main>
      <footer className="bg-content text-content-secondary py-8 text-center text-sm">
        <p>{t("footer")}</p>
      </footer>
    </>
  );
}
