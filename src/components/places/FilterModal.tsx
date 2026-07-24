"use client";

import { useTranslations } from "next-intl";

import type {
  PlaceFilters,
  DogSizeFilter,
  IndoorFilter,
  CarrierFilter,
  RecentFilter,
} from "@/types/place";

interface FilterModalProps {
  isOpen: boolean;
  filters: PlaceFilters;
  onClose: () => void;
  onChange: (filters: PlaceFilters) => void;
  onReset: () => void;
  onApply: () => void;
}

const chipBase = "px-3 py-1.5 rounded-full text-sm border transition-colors";
const chipActive = "bg-orange-500 border-orange-500 text-white";
const chipInactive = "border-gray-300 text-gray-700 hover:border-gray-400 bg-white";

export default function FilterModal({
  isOpen,
  filters,
  onClose,
  onChange,
  onReset,
  onApply,
}: FilterModalProps) {
  const t = useTranslations("places");
  const tCommon = useTranslations("common");

  const INDOOR_OPTIONS: { value: IndoorFilter; label: string }[] = [
    { value: "all", label: t("filters.indoor.all") },
    { value: "indoor", label: t("filters.indoor.indoorAllowed") },
    { value: "outdoor", label: t("filters.indoor.outdoorOnly") },
    { value: "partial-area", label: t("filters.indoor.partialArea") },
    { value: "exclude-unknown", label: t("filters.indoor.excludeUnknown") },
  ];

  const CARRIER_OPTIONS: { value: CarrierFilter; label: string }[] = [
    { value: "all", label: t("filters.carrier.all") },
    { value: "not-required", label: t("filters.carrier.notRequired") },
    { value: "can-bring", label: t("filters.carrier.canBring") },
  ];

  const DOG_SIZE_OPTIONS: { value: DogSizeFilter; label: string }[] = [
    { value: "all", label: t("filters.dogSize.all") },
    { value: "small", label: t("filters.dogSize.small") },
    { value: "medium", label: t("filters.dogSize.medium") },
    { value: "large", label: t("filters.dogSize.large") },
  ];

  const RECENT_OPTIONS: { value: RecentFilter; label: string }[] = [
    { value: "30days", label: t("filters.reliability.30days") },
    { value: "90days", label: t("filters.reliability.90days") },
  ];

  const toggleRecent = (value: RecentFilter) => {
    onChange({ ...filters, recent: filters.recent === value ? "all" : value });
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      )}

      <div
        className={`fixed top-0 right-0 h-full w-full max-w-sm bg-white z-50 shadow-2xl flex flex-col transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="font-bold text-gray-900 text-base">{t("filters.title")}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={tCommon("close")}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-7">
          {/* 실내 동반 여부 */}
          <section>
            <p className="text-sm font-semibold text-gray-900 mb-2.5">{t("filters.indoor.title")}</p>
            <div className="flex flex-wrap gap-2">
              {INDOOR_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onChange({ ...filters, indoor: value })}
                  className={`${chipBase} ${filters.indoor === value ? chipActive : chipInactive}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          {/* 이동장/유모차 */}
          <section>
            <p className="text-sm font-semibold text-gray-900 mb-2.5">{t("filters.carrier.title")}</p>
            <div className="flex flex-wrap gap-2">
              {CARRIER_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onChange({ ...filters, carrier: value })}
                  className={`${chipBase} ${filters.carrier === value ? chipActive : chipInactive}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          {/* 반려견 크기 (단일 선택) */}
          <section>
            <p className="text-sm font-semibold text-gray-900 mb-2.5">{t("filters.dogSize.title")}</p>
            <div className="flex flex-wrap gap-2">
              {DOG_SIZE_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onChange({ ...filters, dogSize: value })}
                  className={`${chipBase} ${filters.dogSize === value ? chipActive : chipInactive}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          {/* 정보 신뢰도 */}
          <section>
            <p className="text-sm font-semibold text-gray-900 mb-2.5">{t("filters.reliability.title")}</p>
            <div className="flex flex-wrap gap-2">
              {RECENT_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleRecent(value)}
                  className={`${chipBase} ${filters.recent === value ? chipActive : chipInactive}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="border-t border-gray-200 px-5 py-4 flex gap-3">
          <button
            type="button"
            onClick={onReset}
            className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {t("filters.reset")}
          </button>
          <button
            type="button"
            onClick={onApply}
            className="flex-1 py-2.5 bg-orange-500 rounded-xl text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
          >
            {t("filters.apply")}
          </button>
        </div>
      </div>
    </>
  );
}
