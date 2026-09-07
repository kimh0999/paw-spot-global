import { getCurrentUser } from "@/lib/auth/current-user";
import { getUserDogsByIds } from "@/lib/dogs/queries";
import { parseDogSelection } from "@/lib/dogs/selection";
import { getFavoritePlaceIds } from "@/lib/favorites/queries";
import { getPlaces } from "@/lib/places/queries";
import PlacesClient from "./PlacesClient";

interface PlacesPageProps {
  searchParams: {
    lat?: string;
    lng?: string;
    sort?: string;
    category?: string;
    q?: string;
    dogId?: string;
    dogIds?: string;
    match?: string;
  };
}

function parseCoord(
  value: string | undefined,
  min: number,
  max: number,
): number | undefined {
  if (!value) return undefined;
  const n = parseFloat(value);
  if (!Number.isFinite(n) || n < min || n > max) return undefined;
  return n;
}

export default async function PlacesPage({ searchParams }: PlacesPageProps) {
  const lat = parseCoord(searchParams.lat, -90, 90);
  const lng = parseCoord(searchParams.lng, -180, 180);

  const userLocation =
    lat != null && lng != null ? { lat, lng } : null;

  const places = await getPlaces({ lat, lng, sort: searchParams.sort });

  const user = await getCurrentUser();
  const selection = parseDogSelection(searchParams);

  // 남의 반려견·삭제된 반려견·형식이 틀린 id는 여기서 그냥 빠진다.
  // 오류를 띄우지 않고 전체 장소를 그대로 보여준다.
  const [favoritePlaceIds, selectedDogs] = user
    ? await Promise.all([
        getFavoritePlaceIds(user.id),
        getUserDogsByIds(user.id, selection.dogIds),
      ])
    : [[], []];

  // 반려견 파라미터가 있었는데 확인된 반려견이 그만큼 나오지 않으면 주소를 정리한다.
  // 형식이 틀린 id는 parseDogSelection에서 이미 빠지므로 파라미터 유무를 따로 본다.
  const hasDogParam = Boolean(searchParams.dogId || searchParams.dogIds);
  const hasStaleDogSelection =
    hasDogParam &&
    (selection.dogIds.length === 0 ||
      selectedDogs.length !== selection.dogIds.length);

  return (
    <PlacesClient
      initialPlaces={places}
      userLocation={userLocation}
      favoritePlaceIds={favoritePlaceIds}
      matchDogs={selectedDogs.map((dog) => ({
        id: dog.id,
        name: dog.name,
        size: dog.size,
      }))}
      hasStaleDogSelection={hasStaleDogSelection}
    />
  );
}
