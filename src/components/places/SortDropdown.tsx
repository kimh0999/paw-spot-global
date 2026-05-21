"use client";

import { useState } from "react";

import type { SortOption } from "@/types/place";

interface SortDropdownProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "distance", label: "거리순 추천" },
  { value: "recent", label: "최근 확인순" },
  { value: "indoor-first", label: "실내 가능 우선" },
  { value: "no-carrier-first", label: "이동장 불필요 우선" },
];

export default function SortDropdown({ value, onChange }: SortDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedLabel = SORT_OPTIONS.find((o) => o.value === value)?.label ?? "";

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
