"use client";

import { useState } from "react";
import { Dialog } from "radix-ui";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";

import { DEFAULT_PLACE_LIST_PARAMS } from "@/lib/places/place-list-params";
import type {
  PlaceFilters,
  DogSizeFilter,
  IndoorFilter,
  CarrierFilter,
} from "@/types/place";

/**
 * 필터 드로어 — **임시 선택 후 일괄 적용**이다.
 *
 * 칩을 눌러도 목록·지도·주소는 그대로다. `결과 보기`를 눌러야 한 번에 적용되고, 그때만
 * 히스토리 항목이 하나 생긴다. 그래서 적용 뒤 뒤로가기 **한 번**이면 변경 전 필터로 돌아간다.
 *
 * 적용된 필터의 단일 출처는 여전히 주소다(`usePlaceListState`). 여기 있는 `draft`는
 * **편집 중인 값**일 뿐이라 그 구조와 어긋나지 않는다. 드로어를 열 때마다 부모가 `key`를
 * 갈아 끼워 이 컴포넌트를 다시 마운트하므로 `draft`는 늘 현재 적용값에서 출발한다
 * (`useEffect`로 prop을 state에 복사하지 않는다 — `src/CLAUDE.md` §15.3).
 */
interface FilterModalProps {
  isOpen: boolean;
  /** 현재 적용된 필터. 임시 선택의 출발점이다. */
  filters: PlaceFilters;
  /** X·ESC·바깥 클릭. 임시 선택은 버린다. */
  onClose: () => void;
  /** `결과 보기`를 눌렀을 때만 호출된다. */
  onApply: (filters: PlaceFilters) => void;
  /** 임시 선택으로 셌을 때 남는 장소 수. 목록과 같은 `filterPlaces`를 쓴다. */
  countFor: (filters: PlaceFilters) => number;
}

// 보이는 크기가 작아도 조작 영역은 44px을 채운다 (DESIGN.md §6 크기와 조작 영역).
const chipBase =
  "inline-flex h-11 items-center rounded-full border px-4 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring";
const chipActive = "border-primary bg-primary text-primary-foreground";
const chipInactive =
  "border-border-control bg-surface text-content hover:bg-surface-subtle";

/** 한 그룹의 칩 묶음. `fieldset`/`legend`가 그룹 제목과 선택지를 이어 준다. */
function ChipGroup<T extends string>({
  title,
  hint,
  options,
  selected,
  onSelect,
}: {
  title: string;
  hint?: string;
  options: { value: T; label: string }[];
  selected: T;
  onSelect: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2.5 text-sm font-bold text-content">{title}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => onSelect(value)}
            aria-pressed={selected === value}
            className={`${chipBase} ${selected === value ? chipActive : chipInactive}`}
          >
            {label}
          </button>
        ))}
      </div>
      {hint && <p className="mt-2 text-xs text-content-secondary">{hint}</p>}
    </fieldset>
  );
}

export default function FilterModal({
  isOpen,
  filters,
  onClose,
  onApply,
  countFor,
}: FilterModalProps) {
  const t = useTranslations("places");
  const tCommon = useTranslations("common");

  // 편집 중인 값. 닫으면 버려지고, 적용할 때만 부모로 넘어간다.
  const [draft, setDraft] = useState<PlaceFilters>(filters);

  const INDOOR_OPTIONS: { value: IndoorFilter; label: string }[] = [
    { value: "all", label: t("filters.indoor.all") },
    { value: "indoor", label: t("filters.indoor.indoorAllowed") },
    { value: "outdoor", label: t("filters.indoor.outdoorOnly") },
    { value: "partial-area", label: t("filters.indoor.partialArea") },
  ];

  const CARRIER_OPTIONS: { value: CarrierFilter; label: string }[] = [
    { value: "all", label: t("filters.carrier.all") },
    { value: "not-required", label: t("filters.carrier.notRequired") },
  ];

  const DOG_SIZE_OPTIONS: { value: DogSizeFilter; label: string }[] = [
    { value: "all", label: t("filters.dogSize.all") },
    { value: "small", label: t("filters.dogSize.small") },
    { value: "medium", label: t("filters.dogSize.medium") },
    { value: "large", label: t("filters.dogSize.large") },
  ];

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(next) => {
        // 닫는 길은 X·ESC·바깥 클릭 셋 다 여기로 온다. 임시 선택은 버린다.
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
            {/* 이용 가능 구역 */}
            <ChipGroup
              title={t("filters.indoor.title")}
              options={INDOOR_OPTIONS}
              selected={draft.indoor}
              onSelect={(indoor) => setDraft({ ...draft, indoor })}
            />

            {/* 이동장·유모차 */}
            <ChipGroup
              title={t("filters.carrier.title")}
              options={CARRIER_OPTIONS}
              selected={draft.carrier}
              onSelect={(carrier) => setDraft({ ...draft, carrier })}
            />

            {/* 내 반려견 크기 — 크기 미확인 장소를 남기는 것은 확정 규칙이라(D-12) 안내로 밝힌다. */}
            <ChipGroup
              title={t("filters.dogSize.title")}
              hint={t("filters.dogSize.hint")}
              options={DOG_SIZE_OPTIONS}
              selected={draft.dogSize}
              onSelect={(dogSize) => setDraft({ ...draft, dogSize })}
            />

            {/* 최근 확인된 정보 — 값이 둘뿐이라 칩 대신 체크박스를 쓴다.
                켜고 끄는 동작이 형태로 드러나고, 다른 그룹의 `전체` 칩과 헷갈리지 않는다. */}
            <fieldset>
              <legend className="mb-2.5 text-sm font-bold text-content">
                {t("filters.reliability.title")}
              </legend>
              <label className="flex min-h-11 items-center gap-3 text-sm text-content">
                <input
                  type="checkbox"
                  checked={draft.recent === "90days"}
                  onChange={(event) =>
                    setDraft({ ...draft, recent: event.target.checked ? "90days" : "all" })
                  }
                  className="h-5 w-5 rounded border-border-control text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                {t("filters.reliability.recent90")}
              </label>
            </fieldset>
          </div>

          <div className="border-t border-border px-5 py-4 flex gap-3">
            <button
              type="button"
              // 드로어 안의 선택만 되돌린다. 목록은 `결과 보기`를 누를 때까지 그대로다.
              onClick={() => setDraft(DEFAULT_PLACE_LIST_PARAMS.filters)}
              className="h-11 flex-1 rounded-lg border border-border-control bg-surface text-sm font-semibold text-content outline-none transition-colors hover:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-ring"
            >
              {t("filters.reset")}
            </button>
            <button
              type="button"
              onClick={() => onApply(draft)}
              className="h-11 flex-1 rounded-lg bg-primary text-sm font-semibold text-primary-foreground outline-none transition-colors hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {t("filters.applyCount", { count: countFor(draft) })}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
