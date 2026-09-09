"use client";

import { useState } from "react";

import PlaceCard from "@/components/places/PlaceCard";
import { useRouter } from "@/i18n/navigation";
import type { DogSizeFilter, PlaceListItem } from "@/types/place";

interface FavoritesListProps {
  places: PlaceListItem[];
  /**
   * 크기 기준 방문 판정에 쓰는 반려견. 이름을 함께 받아 카드가 **누구 기준인지**
   * 밝힐 수 있게 한다. 등록된 반려견이 없으면 판정하지 않는다.
   */
  dog?: { size: DogSizeFilter; name: string | null };
}

export default function FavoritesList({ places, dog }: FavoritesListProps) {
  const router = useRouter();
  const [referenceDate] = useState(() => new Date());

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {places.map((place) => (
        <li key={place.id}>
          <PlaceCard
            place={place}
            referenceDate={referenceDate}
            onClick={() => router.push(`/places/${place.id}`)}
            variant="saved"
            dog={dog}
          />
        </li>
      ))}
    </ul>
  );
}
