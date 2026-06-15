import { getTranslations } from "next-intl/server";
import Header from "@/components/Header";
import HeroSection from "@/components/home/HeroSection";
import CategorySection from "@/components/home/CategorySection";
import InfoSection from "@/components/home/InfoSection";
import RecentPlacesSection from "@/components/home/RecentPlacesSection";
import { getHomePlaces } from "@/lib/places/queries";
import type { HomePlaceItem } from "@/types/place";

export default async function Home() {
  const t = await getTranslations("home");
  let homePlaces: HomePlaceItem[] = [];

  try {
    homePlaces = await getHomePlaces();
  } catch (error) {
    console.error("[Home] Failed to load visible places", error);
  }

  return (
    <>
      <Header />
      <main>
        <HeroSection />
        <CategorySection />
        <InfoSection />
        <RecentPlacesSection places={homePlaces} />
      </main>
      <footer className="bg-gray-900 text-gray-500 py-8 text-center text-sm">
        <p>{t("footer")}</p>
      </footer>
    </>
  );
}
