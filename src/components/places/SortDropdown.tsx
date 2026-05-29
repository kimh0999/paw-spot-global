"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import type { SortOption } from "@/types/place";

interface SortDropdownProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
}

export default function SortDropdown({ value, onChange }: SortDropdownProps) {
  const t = useTranslations("places");
  const [isOpen, setIsOpen] = useState(false);

  const SORT_OPTIONS: { value: SortOption; label: string }[] = [
    { value: "recent", label: t("sort.recent") },
    { value: "indoor-first", label: t("sort.indoorFirst") },
    { value: "no-carrier-first", label: t("sort.noCarrierFirst") },
  ];

  const selectedLabel =
    SORT_OPTIONS.find((o) => o.value === value)?.label ??
    (value === "distance" ? t("sort.distance") : "");

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 rounded-full text-sm font-medium text-gray-700 hover:border-gray-400 bg-white transition-colors"
      >
        {selectedLabel}
        <span className="text-gray-400 text-xs">{isOpen ? "▲" : "▼"}</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
            {SORT_OPTIONS.map(({ value: optValue, label }) => (
              <button
                key={optValue}
                type="button"
                onClick={() => {
                  onChange(optValue);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                  value === optValue
                    ? "bg-orange-50 text-orange-600 font-semibold"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
