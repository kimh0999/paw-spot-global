"use client";

import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import { DropdownMenu } from "radix-ui";

import type { SortOption } from "@/types/place";

interface SortDropdownProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
  hasLocation?: boolean;
}

// DogCard의 메뉴 항목과 같은 형태. 높이 44px는 `DESIGN.md` §11 터치 타깃 규칙이다.
const itemClass =
  "flex h-11 cursor-pointer select-none items-center rounded-md px-3 text-sm outline-none transition-colors data-[highlighted]:bg-surface-subtle data-[disabled]:cursor-not-allowed data-[disabled]:text-content-muted";

export default function SortDropdown({ value, onChange, hasLocation = false }: SortDropdownProps) {
  const t = useTranslations("places");

  const SORT_OPTIONS: { value: SortOption; label: string; disabled?: boolean }[] = [
    { value: "distance", label: t("sort.distance"), disabled: !hasLocation },
    { value: "recent", label: t("sort.recent") },
    { value: "indoor-first", label: t("sort.indoorFirst") },
    { value: "no-carrier-first", label: t("sort.noCarrierFirst") },
  ];

  const selectedLabel =
    SORT_OPTIONS.find((o) => o.value === value)?.label ?? t("sort.recent");

  return (
    <DropdownMenu.Root>
      {/* Radix가 `aria-expanded`·`aria-haspopup`·`aria-controls`를 붙이고 키보드(화살표·Home/End·
          타이핑 검색)와 ESC, 바깥 클릭, 닫힌 뒤 트리거로의 포커스 복귀까지 맡는다. */}
      <DropdownMenu.Trigger
        aria-label={t("sort.label", { current: selectedLabel })}
        className="group flex h-11 items-center gap-1.5 rounded-lg border border-border-control bg-surface px-3 text-sm font-medium text-content outline-none transition-colors hover:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-ring"
      >
        {selectedLabel}
        {/* 예전에는 `▲`/`▼` 문자였다. 스크린리더가 읽어 버리므로 아이콘 + `aria-hidden`으로 바꿨다. */}
        <ChevronDown
          className="h-4 w-4 text-content-muted transition-transform duration-fast ease-standard group-data-[state=open]:rotate-180 motion-reduce:transition-none"
          aria-hidden="true"
        />
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        {/* 트리거가 목록 패널 오른쪽 끝에 있어 오른쪽 정렬로 연다. 예전 구현은 패널의
            `overflow-hidden`에 잘릴 수 있었는데, Portal로 나가면서 그 제약이 사라졌다. */}
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          className="z-dropdown w-52 origin-top-right overflow-hidden rounded-panel border border-border bg-surface p-1 shadow-lg data-[state=open]:animate-popover-in data-[state=closed]:animate-popover-out motion-reduce:animate-none"
        >
          {/* 하나만 고르는 값이므로 RadioGroup이다 — 각 항목이 `aria-checked`를 갖는다. */}
          <DropdownMenu.RadioGroup
            value={value}
            onValueChange={(next) => onChange(next as SortOption)}
          >
            {SORT_OPTIONS.map(({ value: optValue, label, disabled }) => (
              <DropdownMenu.RadioItem
                key={optValue}
                value={optValue}
                disabled={disabled}
                className={`${itemClass} ${
                  value === optValue
                    ? "bg-primary-soft font-semibold text-primary"
                    : "text-content"
                }`}
              >
                {label}
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
