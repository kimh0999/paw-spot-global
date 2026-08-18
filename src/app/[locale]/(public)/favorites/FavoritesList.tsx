"use client";

import { useState } from "react";

import PlaceCard from "@/components/places/PlaceCard";
import { useRouter } from "@/i18n/navigation";
import type { DogSizeFilter, PlaceListItem } from "@/types/place";

interface FavoritesListProps {
  places: PlaceListItem[];
  dogSize?: DogSizeFilter;
}

export default function FavoritesList({ places, dogSize }: FavoritesListProps) {
  const router = useRouter();
  const [referenceDate] = useState(() => new Date());

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {places.map((place) => (
        <PlaceCard
          key={place.id}
          place={place}
          referenceDate={referenceDate}
          onClick={() => router.push(`/places/${place.id}`)}
          action="openDetails"
          dogSize={dogSize}
        />
      ))}
    </div>
  );
}
