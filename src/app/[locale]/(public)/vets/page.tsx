import Header from "@/components/Header";
import VetsClient from "@/components/vets/VetsClient";
import { getPublicVetClinics } from "@/lib/vets/queries";
import type { VetClinicListItem } from "@/lib/vets/types";

interface VetsPageProps {
  searchParams: {
    lat?: string;
    lng?: string;
  };
}

/**
 * 동물병원 목록 (P0).
 *
 * 위치는 **사용자가 목록에서 버튼을 눌러야** URL에 붙는다. 서버는 그 값이 있을 때만
 * 거리를 계산하고, 없으면 거리를 만들지 않는다.
 *
 * 조회 실패를 결과 0건으로 뭉개지 않는다 — 화면이 다른 안내를 내야 하므로 플래그로 넘긴다.
 */
export default async function VetsPage({ searchParams }: VetsPageProps) {
  const lat = Number(searchParams.lat);
  const lng = Number(searchParams.lng);
  const userLocation =
    searchParams.lat != null && Number.isFinite(lat) && Number.isFinite(lng)
      ? { lat, lng }
      : null;

  let clinics: VetClinicListItem[] = [];
  let loadFailed = false;

  try {
    clinics = await getPublicVetClinics(userLocation);
  } catch (error) {
    console.error("[vets] 목록 조회 실패", error);
    loadFailed = true;
  }

  return (
    <>
      <Header />
      <main id="main-content" tabIndex={-1} className="bg-surface-page pb-16">
        <VetsClient clinics={clinics} loadFailed={loadFailed} />
      </main>
    </>
  );
}
