"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import type { SortOption } from "@/types/place";

interface SortDropdownProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
  hasLocation?: boolean;
}

export default function SortDropdown({ value, onChange, hasLocation = false }: SortDropdownProps) {
  const t = useTranslations("places");
  const [isOpen, setIsOpen] = useState(false);

  const SORT_OPTIONS: { value: SortOption; label: string; disabled?: boolean }[] = [
    { value: "distance", label: t("sort.distance"), disabled: !hasLocation },
    { value: "recent", label: t("sort.recent") },
    { value: "indoor-first", label: t("sort.indoorFirst") },
    { value: "no-carrier-first", label: t("sort.noCarrierFirst") },
  ];

  const selectedLabel =
    SORT_OPTIONS.find((o) => o.value === value)?.label ?? t("sort.recent");

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1.5 px-4 py-2 border border-strong rounded-full text-sm font-medium text-content hover:bg-surface-subtle bg-surface transition-colors"
      >
        {selectedLabel}
        <span className="text-content-muted text-xs">{isOpen ? "▲" : "▼"}</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-dropdown" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 top-full mt-1 w-52 bg-surface border rounded-xl shadow-lg z-dropdown overflow-hidden">
            {SORT_OPTIONS.map(({ value: optValue, label, disabled }) => (
              <button
                key={optValue}
                type="button"
                disabled={disabled}
                onClick={() => {
                  if (disabled) return;
                  onChange(optValue);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                  disabled
                    ? "text-content-muted cursor-not-allowed"
                    : value === optValue
                      ? "bg-primary-soft text-primary font-semibold"
                      : "text-content hover:bg-surface-subtle"
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
