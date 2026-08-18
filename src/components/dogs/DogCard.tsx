"use client";

import { useRef } from "react";
import { DropdownMenu } from "radix-ui";
import { useLocale, useTranslations } from "next-intl";
import { EllipsisVertical, MapPin, PawPrint, Pencil, Trash2 } from "lucide-react";

import { Link } from "@/i18n/navigation";
import type { DogSize } from "@/lib/constants";
import { formatDogBreed } from "@/lib/dogs/breeds";
import type { DogSummary } from "@/lib/dogs/queries";
import { buildDogPlacesHref } from "@/lib/dogs/selection";
import { isSupportedLocale } from "@/lib/i18n/locale";

interface DogCardProps {
  dog: DogSummary;
  onEdit: (dog: DogSummary, trigger: HTMLElement | null) => void;
  onDelete: (dog: DogSummary, trigger: HTMLElement | null) => void;
}

const menuItemClass =
  "flex h-11 cursor-pointer select-none items-center gap-2 rounded-md px-3 text-sm outline-none data-[highlighted]:bg-surface-subtle";

export default function DogCard({ dog, onEdit, onDelete }: DogCardProps) {
  const t = useTranslations("dogs");
  const rawLocale = useLocale();
  const locale = isSupportedLocale(rawLocale) ? rawLocale : "en";
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const sizeLabels: Record<DogSize, string> = {
    SMALL: t("form.sizeOptions.small"),
    MEDIUM: t("form.sizeOptions.medium"),
    LARGE: t("form.sizeOptions.large"),
  };
  const breedLabel = formatDogBreed(dog, locale);

  return (
    <li className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-4">
      {/* 사진 없이 시작한다. 기본 아바타는 장식이므로 screen reader에서 감춘다. */}
      <span
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary"
        aria-hidden="true"
      >
        <PawPrint size={22} strokeWidth={1.5} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-content">{dog.name}</h3>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-content-secondary">
              <span className="inline-flex items-center rounded-full bg-surface-subtle px-2 py-0.5 text-xs font-medium text-content">
                {sizeLabels[dog.size]}
              </span>
              {breedLabel && <span className="truncate">{breedLabel}</span>}
            </p>
          </div>

          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                ref={menuButtonRef}
                type="button"
                aria-label={t("card.menuLabel", { name: dog.name })}
                className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-content-muted outline-none transition-colors hover:bg-surface-subtle hover:text-content focus-visible:ring-2 focus-visible:ring-ring"
              >
                <EllipsisVertical size={18} strokeWidth={1.5} aria-hidden="true" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={4}
                className="z-dropdown min-w-[10rem] rounded-lg border border-border bg-surface p-1 shadow-lg"
              >
                <DropdownMenu.Item
                  className={`${menuItemClass} text-content`}
                  onSelect={() => onEdit(dog, menuButtonRef.current)}
                >
                  <Pencil size={16} strokeWidth={1.5} aria-hidden="true" />
                  {t("card.edit")}
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  className={`${menuItemClass} text-danger`}
                  onSelect={() => onDelete(dog, menuButtonRef.current)}
                >
                  <Trash2 size={16} strokeWidth={1.5} aria-hidden="true" />
                  {t("card.delete")}
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>

        <Link
          href={buildDogPlacesHref([dog.id])}
          className="mt-3 inline-flex h-11 items-center gap-1.5 rounded-lg border border-border-strong bg-surface px-3 text-sm font-semibold text-content outline-none transition-colors hover:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-ring"
        >
          <MapPin size={16} strokeWidth={1.5} aria-hidden="true" />
          {t("card.viewPlaces")}
        </Link>
      </div>
    </li>
  );
}
