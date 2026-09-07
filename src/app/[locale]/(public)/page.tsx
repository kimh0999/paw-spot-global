import { getTranslations } from "next-intl/server";
import Header from "@/components/Header";
import HeroSection from "@/components/home/HeroSection";
import CategorySection from "@/components/home/CategorySection";
import InfoSection from "@/components/home/InfoSection";

export default async function Home() {
  const t = await getTranslations("home");

  return (
    <>
      <Header />
      <main>
        <HeroSection />
        <CategorySection />
        <InfoSection />
      </main>
      <footer className="bg-content text-content-secondary py-8 text-center text-sm">
        <p>{t("footer")}</p>
      </footer>
    </>
  );
}
