"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { LoaderCircle, MapPin, Navigation, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { isOutsideServiceArea } from "@/lib/places/service-area";
import { VET_DISTRICTS } from "@/lib/vets/constants";
import {
  getActiveVetFilterCount,
  getVetClinics,
  parseVetListParams,
} from "@/lib/vets/filtering";
import type { VetClinicListItem } from "@/lib/vets/types";
import VetClinicCard from "./VetClinicCard";

/**
 * 병원 목록 화면.
 *
 * **상태는 전부 URL 쿼리에 둔다.** 언어를 바꾸면 경로만 갈아 끼우므로 검색어·지역·필터·
 * 정렬이 그대로 남는다. 컴포넌트 state로 두면 언어 전환에서 초기화된다.
 *
 * 위치는 **사용자가 버튼을 눌렀을 때만** 요청한다. 거부하거나 쓰지 않아도 지역 선택과
 * 검색은 계속 동작하고, 그 상태의 목록을 `내 주변`이라 부르지 않는다.
 */
interface Props {
  clinics: VetClinicListItem[];
  /** 서버 조회가 실패했는가. 결과 0건과 다른 안내를 낸다. */
  loadFailed?: boolean;
}

export default function VetsClient({ clinics, loadFailed = false }: Props) {
  const t = useTranslations("vets");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const params = useMemo(
    () => parseVetListParams(Object.fromEntries(searchParams.entries())),
    [searchParams],
  );

  const userLocation = useMemo(() => {
    const lat = Number(searchParams.get("lat"));
    const lng = Number(searchParams.get("lng"));
    return Number.isFinite(lat) && Number.isFinite(lng) && searchParams.has("lat")
      ? { lat, lng }
      : null;
  }, [searchParams]);

  const [queryDraft, setQueryDraft] = useState(params.query);
  const [isLocating, setIsLocating] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);

  const write = useCallback(
    (next: Record<string, string | null>) => {
      const merged = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(next)) {
        if (value === null) merged.delete(key);
        else merged.set(key, value);
      }
      router.replace(`${pathname}?${merged.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  function handleUseLocation() {
    if (!navigator.geolocation) {
      setLocationDenied(true);
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        setLocationDenied(false);
        write({
          lat: String(position.coords.latitude),
          lng: String(position.coords.longitude),
          sort: "distance",
        });
      },
      () => {
        // 거부해도 화면을 막지 않는다. 지역 선택과 검색으로 계속 찾을 수 있다.
        setIsLocating(false);
        setLocationDenied(true);
      },
      { timeout: 10_000 },
    );
  }

  // 거리순은 위치가 있어야 성립한다. 위치가 없으면 최근 확인순으로 읽는다.
  const effectiveSort = userLocation ? params.sort : "recent";
  const visible = useMemo(
    () => getVetClinics(clinics, { ...params, sort: effectiveSort }),
    [clinics, params, effectiveSort],
  );

  const activeFilters = getActiveVetFilterCount(params);
  const outsideServiceArea = userLocation ? isOutsideServiceArea(userLocation) : false;

  function renderResults() {
    if (loadFailed) {
      return (
        <div className="rounded-card border border-border bg-surface px-6 py-12 text-center">
          <p className="text-sm text-content-secondary">{t("results.error")}</p>
          <button
            type="button"
            onClick={() => router.refresh()}
            className="mt-4 h-11 rounded-lg border border-border-control px-6 text-sm font-semibold text-content outline-none hover:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t("results.retry")}
          </button>
        </div>
      );
    }

    // 등록 병원이 아예 없는 것과 필터로 0건이 된 것은 다른 사실이다.
    if (clinics.length === 0) {
      return (
        <div className="rounded-card border border-dashed border-border-strong px-6 py-12 text-center">
          <p className="text-sm text-content-secondary">{t("results.emptyNone")}</p>
        </div>
      );
    }

    if (visible.length === 0) {
      return (
        <div className="rounded-card border border-dashed border-border-strong px-6 py-12 text-center">
          <p className="text-sm text-content-secondary">{t("results.emptyFiltered")}</p>
          {/* 필터를 몰래 풀지 않는다. 사용자가 눌러야 풀린다. */}
          <button
            type="button"
            onClick={() =>
              write({ district: null, english: null, night: null, q: null })
            }
            className="mt-4 h-11 rounded-lg border border-border-control px-6 text-sm font-semibold text-content outline-none hover:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t("results.emptyFilteredAction")}
          </button>
        </div>
      );
    }

    return (
      <ul className="space-y-3">
        {visible.map((clinic) => (
          <li key={clinic.id}>
            <VetClinicCard clinic={clinic} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="mx-auto max-w-[720px] px-4 py-6 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight text-content">{t("title")}</h1>
      <p className="mt-1 text-sm text-content-secondary">{t("subtitle")}</p>

      {/* 검색 — 첫 화면에서 바로 쓸 수 있어야 한다 */}
      <form
        className="mt-4 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          write({ q: queryDraft.trim() || null });
        }}
      >
        <div className="relative min-w-0 flex-1">
          <Search
            size={18}
            strokeWidth={2}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-content-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            value={queryDraft}
            onChange={(event) => setQueryDraft(event.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchLabel")}
            className="h-12 w-full rounded-lg border border-border-control bg-surface pl-10 pr-4 text-base text-content outline-none transition-colors placeholder:text-content-muted focus:border-primary focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          type="submit"
          className="h-12 shrink-0 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground outline-none transition-colors hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t("searchLabel")}
        </button>
      </form>

      {/* 지역 선택 */}
      <div className="-mx-4 mt-3 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex w-max gap-2" role="group" aria-label={t("districtLabel")}>
          <FilterChip
            active={params.district === "all"}
            onClick={() => write({ district: null })}
          >
            {t("districtAll")}
          </FilterChip>
          {VET_DISTRICTS.map((district) => (
            <FilterChip
              key={district}
              active={params.district === district}
              onClick={() => write({ district })}
            >
              {t(`district.${district}`)}
            </FilterChip>
          ))}
        </div>
      </div>

      {/* 안내 확인 필터 + 내 위치 */}
      <div className="mt-2 flex flex-wrap gap-2">
        <FilterChip
          active={params.englishConfirmed}
          onClick={() => write({ english: params.englishConfirmed ? null : "confirmed" })}
        >
          {t("filters.englishConfirmed")}
        </FilterChip>
        <FilterChip
          active={params.afterHoursConfirmed}
          onClick={() => write({ night: params.afterHoursConfirmed ? null : "confirmed" })}
        >
          {t("filters.afterHoursConfirmed")}
        </FilterChip>
        <button
          type="button"
          onClick={handleUseLocation}
          disabled={isLocating}
          className="inline-flex h-11 items-center gap-1.5 rounded-full border border-border-control bg-surface px-4 text-sm font-medium text-content outline-none transition-colors hover:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLocating ? (
            <LoaderCircle
              className="h-4 w-4 animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
          ) : (
            <Navigation className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          )}
          {isLocating ? t("locating") : t("myLocation")}
        </button>
      </div>

      {activeFilters > 0 && (
        <p className="mt-2 text-xs text-content-secondary">{t("filters.note")}</p>
      )}
      {locationDenied && (
        <p className="mt-2 text-xs text-warning">{t("locationDenied")}</p>
      )}

      {outsideServiceArea && (
        <section className="mt-4 rounded-card border border-border bg-surface-subtle p-4">
          <h2 className="text-sm font-bold text-content">{t("outOfArea.title")}</h2>
          <p className="mt-1 text-xs text-content-secondary">{t("outOfArea.description")}</p>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("animal hospital")}&center=${userLocation?.lat},${userLocation?.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex h-11 items-center gap-1.5 rounded-lg border border-border-control bg-surface px-4 text-sm font-semibold text-content outline-none hover:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-ring"
          >
            <MapPin size={16} strokeWidth={2} aria-hidden="true" />
            {t("outOfArea.searchExternal")}
          </a>
        </section>
      )}

      {/* 결과 머리말 — 개수와 정렬 기준을 함께 말한다 */}
      <div className="mt-5 border-b border-border pb-2">
        <p className="text-sm font-semibold text-content">
          {t("results.count", { count: visible.length })}
        </p>
        <p className="mt-0.5 text-xs text-content-secondary">
          {effectiveSort === "distance"
            ? `${t("sort.distance")} · ${t("sort.distanceBasis")} ${t("sort.noCoordinate")}`
            : `${t("sort.recent")} · ${t("sort.recentBasis")}`}
        </p>
      </div>

      <div className="mt-4">{renderResults()}</div>

      <p className="mt-6 text-xs text-content-muted">{t("hours.checkByPhone")}</p>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "h-11 shrink-0 rounded-full border px-4 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border-control bg-surface text-content hover:bg-surface-subtle",
      )}
    >
      {children}
    </button>
  );
}
