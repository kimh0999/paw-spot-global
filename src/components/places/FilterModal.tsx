"use client";

import { Dialog } from "radix-ui";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";

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

// 보이는 크기가 작아도 조작 영역은 44px을 채운다 (DESIGN.md §6 크기와 조작 영역).
const chipBase =
  "inline-flex h-11 items-center rounded-full border px-4 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring";
const chipActive = "border-primary bg-primary text-primary-foreground";
const chipInactive =
  "border-border-control bg-surface text-content hover:bg-surface-subtle";

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
    <Dialog.Root
      open={isOpen}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Dialog.Portal>
        {/* Radix가 ESC·바깥 클릭·focus trap·스크롤 잠금을 담당한다. 모션 값은 계획 003에서
            정한 그대로 — 250ms, 진입/퇴장 커브 분리, reduced motion에서는 전부 제거. */}
        <Dialog.Overlay className="fixed inset-0 z-drawer bg-overlay data-[state=open]:animate-overlay-in data-[state=closed]:animate-overlay-out motion-reduce:animate-none" />

        <Dialog.Content
          // 설명 문단이 없는 필터 패널이라 Radix의 aria-describedby 연결을 끈다.
          aria-describedby={undefined}
          className="fixed right-0 top-0 z-drawer flex h-full w-full max-w-sm flex-col bg-surface shadow-lg outline-none data-[state=open]:animate-drawer-in data-[state=closed]:animate-drawer-out motion-reduce:animate-none"
        >
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <Dialog.Title className="font-bold text-content text-base">
              {t("filters.title")}
            </Dialog.Title>
            <Dialog.Close
              aria-label={tCommon("close")}
              className="-mr-2 flex h-11 w-11 items-center justify-center rounded-md text-content-secondary outline-none transition-colors hover:bg-surface-subtle hover:text-content focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
            </Dialog.Close>
          </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-7">
          {/* 실내 동반 여부 */}
          <section>
            <p className="mb-2.5 text-sm font-bold text-content">{t("filters.indoor.title")}</p>
            <div className="flex flex-wrap gap-2">
              {INDOOR_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onChange({ ...filters, indoor: value })}
                  aria-pressed={filters.indoor === value}
                  className={`${chipBase} ${filters.indoor === value ? chipActive : chipInactive}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          {/* 이동장/유모차 */}
          <section>
            <p className="mb-2.5 text-sm font-bold text-content">{t("filters.carrier.title")}</p>
            <div className="flex flex-wrap gap-2">
              {CARRIER_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onChange({ ...filters, carrier: value })}
                  aria-pressed={filters.carrier === value}
                  className={`${chipBase} ${filters.carrier === value ? chipActive : chipInactive}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          {/* 반려견 크기 (단일 선택) */}
          <section>
            <p className="mb-2.5 text-sm font-bold text-content">{t("filters.dogSize.title")}</p>
            <div className="flex flex-wrap gap-2">
              {DOG_SIZE_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onChange({ ...filters, dogSize: value })}
                  aria-pressed={filters.dogSize === value}
                  className={`${chipBase} ${filters.dogSize === value ? chipActive : chipInactive}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          {/* 정보 신뢰도 */}
          <section>
            <p className="mb-2.5 text-sm font-bold text-content">{t("filters.reliability.title")}</p>
            <div className="flex flex-wrap gap-2">
              {RECENT_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleRecent(value)}
                  aria-pressed={filters.recent === value}
                  className={`${chipBase} ${filters.recent === value ? chipActive : chipInactive}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="border-t border-border px-5 py-4 flex gap-3">
          <button
            type="button"
            onClick={onReset}
            className="h-11 flex-1 rounded-lg border border-border-control bg-surface text-sm font-semibold text-content outline-none transition-colors hover:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t("filters.reset")}
          </button>
          <button
            type="button"
            onClick={onApply}
            className="h-11 flex-1 rounded-lg bg-primary text-sm font-semibold text-primary-foreground outline-none transition-colors hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {t("filters.apply")}
          </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
