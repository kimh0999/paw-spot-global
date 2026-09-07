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

const chipBase = "px-3 py-1.5 rounded-full text-sm border transition-colors";
const chipActive = "bg-primary border-primary text-primary-foreground";
const chipInactive = "border-border-strong text-content hover:border-border-strong bg-surface";

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
          className="fixed top-0 right-0 z-drawer flex h-full w-full max-w-sm flex-col bg-surface shadow-2xl outline-none data-[state=open]:animate-drawer-in data-[state=closed]:animate-drawer-out motion-reduce:animate-none"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <Dialog.Title className="font-bold text-content text-base">
              {t("filters.title")}
            </Dialog.Title>
            <Dialog.Close
              aria-label={tCommon("close")}
              className="rounded-md text-content-muted outline-none transition-colors hover:text-content-secondary focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="w-5 h-5" strokeWidth={1.5} aria-hidden="true" />
            </Dialog.Close>
          </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-7">
          {/* 실내 동반 여부 */}
          <section>
            <p className="text-sm font-semibold text-content mb-2.5">{t("filters.indoor.title")}</p>
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
            <p className="text-sm font-semibold text-content mb-2.5">{t("filters.carrier.title")}</p>
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
            <p className="text-sm font-semibold text-content mb-2.5">{t("filters.dogSize.title")}</p>
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
            <p className="text-sm font-semibold text-content mb-2.5">{t("filters.reliability.title")}</p>
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

        <div className="border-t border-border px-5 py-4 flex gap-3">
          <button
            type="button"
            onClick={onReset}
            className="flex-1 py-2.5 border border-border-strong rounded-xl text-sm font-semibold text-content hover:bg-surface-subtle transition-colors"
          >
            {t("filters.reset")}
          </button>
          <button
            type="button"
            onClick={onApply}
            className="flex-1 py-2.5 bg-primary rounded-xl text-sm font-semibold text-primary-foreground hover:bg-primary-hover transition-colors"
          >
            {t("filters.apply")}
          </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
