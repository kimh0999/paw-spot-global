import type { Place, ConditionStatus } from "@/types/place";
import ConditionBadge from "./ConditionBadge";

interface PlaceCardProps {
  place: Place;
  onClick?: () => void;
}

const categoryIcon: Record<Place["category"], string> = {
  cafe: "☕",
  restaurant: "🍽️",
  travel: "🌿",
};

const categoryLabel: Record<Place["category"], string> = {
  cafe: "Cafe",
  restaurant: "Restaurant",
  travel: "Travel Spot",
};

const cardBg: Record<Place["category"], string> = {
  cafe: "from-amber-100 to-orange-50",
  restaurant: "from-orange-100 to-red-50",
  travel: "from-green-100 to-emerald-50",
};

function getConditionChips(place: Place): Array<{ label: string; status: ConditionStatus }> {
  const chips: Array<{ label: string; status: ConditionStatus }> = [];

  if (place.indoorAllowed === true) chips.push({ label: "실내 가능", status: "good" });
  else if (place.indoorAllowed === false) chips.push({ label: "야외만 가능", status: "warning" });
  else chips.push({ label: "실내 확인 필요", status: "warning" });

  if (place.carrierRequired === false) chips.push({ label: "이동장 불필요", status: "good" });
  else if (place.carrierRequired === true) chips.push({ label: "이동장 필요", status: "bad" });

  const sizeLabel: Record<string, string> = {
    small: "소형견",
    medium: "중형견",
    large: "대형견",
  };
  place.dogSizesAllowed.forEach((size) => {
    chips.push({ label: sizeLabel[size], status: "good" });
  });

  return chips;
}

export default function PlaceCard({ place, onClick }: PlaceCardProps) {
  const chips = getConditionChips(place);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md hover:border-orange-200 transition-all">
      <div
        className={`w-full h-36 bg-gradient-to-br ${cardBg[place.category]} flex items-center justify-center`}
      >
        <span className="text-5xl">{categoryIcon[place.category]}</span>
      </div>

      <div className="p-4">
        <p className="text-xs text-gray-400 mb-1">
          {categoryLabel[place.category]} · {place.area} · {place.distanceKm}km
        </p>
        <h3 className="font-bold text-gray-900 text-base leading-snug">{place.name}</h3>
        <p className="text-xs text-gray-500 mt-0.5 mb-3 leading-relaxed">{place.address}</p>

        <div className="flex flex-wrap gap-1.5 mb-3">
          {chips.map((chip) => (
            <ConditionBadge key={chip.label} label={chip.label} status={chip.status} />
          ))}
        </div>

        {place.caution && (
          <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-2.5 py-1.5 mb-3">
            유의: {place.caution}
          </p>
        )}

        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-gray-400">
            확인일: {place.verifiedAt} · {place.verificationMethod}
          </p>
          <button
            type="button"
            onClick={onClick}
            className="text-xs font-semibold text-orange-600 hover:text-orange-700 transition-colors"
          >
            자세히
          </button>
        </div>
      </div>
    </div>
  );
}
