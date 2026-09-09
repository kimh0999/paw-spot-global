"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, ChevronDown, X } from "lucide-react";

import { findDogBreed, searchDogBreeds } from "@/lib/dogs/breeds";
import { isSupportedLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

interface BreedComboboxProps {
  value: string | null;
  onChange: (code: string | null) => void;
  labelledBy: string;
  describedBy?: string;
  invalid?: boolean;
  disabled?: boolean;
}

/**
 * 견종 선택. 한글·영문 어느 쪽으로 입력해도 같은 항목을 찾는다.
 * 선택 결과는 code로만 다루고 화면 label은 현재 locale에서 만든다.
 */
export default function BreedCombobox({
  value,
  onChange,
  labelledBy,
  describedBy,
  invalid = false,
  disabled = false,
}: BreedComboboxProps) {
  const t = useTranslations("dogs.form");
  const rawLocale = useLocale();
  const locale = isSupportedLocale(rawLocale) ? rawLocale : "en";

  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<(HTMLLIElement | null)[]>([]);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const options = useMemo(() => searchDogBreeds(query), [query]);
  const selected = value ? findDogBreed(value) : null;
  const selectedLabel = selected
    ? locale === "ko"
      ? selected.ko
      : selected.en
    : "";

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // 키보드로 옮긴 항목이 목록 밖으로 나가지 않게 한다.
  useEffect(() => {
    if (!open) return;
    optionRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  function openList() {
    if (disabled) return;
    setQuery("");
    setOpen(true);
  }

  function closeList() {
    setOpen(false);
    setQuery("");
  }

  function select(code: string) {
    onChange(code);
    closeList();
    inputRef.current?.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        openList();
        return;
      }
      if (options.length === 0) return;
      const delta = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((prev) => (prev + delta + options.length) % options.length);
      return;
    }

    if (event.key === "Home" && open) {
      event.preventDefault();
      setActiveIndex(0);
      return;
    }
    if (event.key === "End" && open) {
      event.preventDefault();
      setActiveIndex(Math.max(options.length - 1, 0));
      return;
    }

    if (event.key === "Enter" && open) {
      event.preventDefault();
      const option = options[activeIndex];
      if (option) select(option.code);
      return;
    }

    if (event.key === "Escape" && open) {
      event.preventDefault();
      closeList();
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative"
      onBlur={(event) => {
        if (!containerRef.current?.contains(event.relatedTarget as Node | null)) {
          closeList();
        }
      }}
    >
      <input type="hidden" name="breedCode" value={value ?? ""} />

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          autoComplete="off"
          disabled={disabled}
          aria-labelledby={labelledBy}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            open && options[activeIndex]
              ? `${listboxId}-${options[activeIndex].code}`
              : undefined
          }
          value={open ? query : selectedLabel}
          placeholder={open && selectedLabel ? selectedLabel : t("breedPlaceholder")}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={openList}
          onClick={openList}
          onKeyDown={handleKeyDown}
          className={cn(
            "h-11 w-full rounded-lg border bg-surface pl-3 pr-20 text-sm text-content outline-none focus:border-primary focus:ring-2 focus:ring-ring",
            invalid ? "border-danger" : "border-border-control",
            disabled && "opacity-60",
          )}
        />

        <div className="absolute inset-y-0 right-0 flex items-center">
          {value && !disabled && (
            <button
              type="button"
              onClick={() => {
                onChange(null);
                closeList();
                inputRef.current?.focus();
              }}
              aria-label={t("breedClear")}
              className="flex h-11 w-11 items-center justify-center rounded-lg text-content-muted outline-none hover:text-content focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X size={16} strokeWidth={1.5} aria-hidden="true" />
            </button>
          )}
          <span className="pointer-events-none flex h-11 w-9 items-center justify-center text-content-muted">
            <ChevronDown size={16} strokeWidth={1.5} aria-hidden="true" />
          </span>
        </div>
      </div>

      {open && (
        <ul
          id={listboxId}
          role="listbox"
          aria-labelledby={labelledBy}
          className="absolute z-dropdown mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-border bg-surface py-1 shadow-lg"
        >
          {options.length === 0 ? (
            <li className="px-3 py-2 text-sm text-content-muted">
              {t("breedNoResult")}
            </li>
          ) : (
            options.map((breed, index) => {
              const isActive = index === activeIndex;
              const isSelected = breed.code === value;
              return (
                <li
                  key={breed.code}
                  id={`${listboxId}-${breed.code}`}
                  ref={(node) => {
                    optionRefs.current[index] = node;
                  }}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(event) => {
                    // blur로 목록이 먼저 닫히지 않게 한다.
                    event.preventDefault();
                    select(breed.code);
                  }}
                  className={cn(
                    "flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm text-content",
                    isActive && "bg-primary-soft",
                  )}
                >
                  <span>{locale === "ko" ? breed.ko : breed.en}</span>
                  {isSelected && (
                    <Check size={16} strokeWidth={2} className="text-primary" aria-hidden="true" />
                  )}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
