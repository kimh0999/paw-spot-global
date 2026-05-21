import Header from "@/components/Header";
import HeroSection from "@/components/home/HeroSection";
import CategorySection from "@/components/home/CategorySection";
import InfoSection from "@/components/home/InfoSection";
import RecentPlacesSection from "@/components/home/RecentPlacesSection";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <HeroSection />
        <CategorySection />
        <InfoSection />
        <RecentPlacesSection />
      </main>
      <footer className="bg-gray-900 text-gray-500 py-8 text-center text-sm">
        <p>© 2026 Paw Spot Global. 반려견 동반 장소 정보는 변경될 수 있습니다.</p>
      </footer>
    </>
  );
}
