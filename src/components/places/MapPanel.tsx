"use client";

import { useEffect, useRef, useState } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { useTranslations } from "next-intl";

import {
  SERVICE_AREA_CENTER,
  SERVICE_AREA_ZOOM,
} from "@/lib/places/service-area";
import type { PlaceListItem } from "@/types/place";

interface MapPanelProps {
  places: PlaceListItem[];
  selectedPlaceId: string | null;
  hoveredPlaceId?: string | null;
  onSelectPlace: (id: string) => void;
  userLocation?: { lat: number; lng: number } | null;
  onRequestUserLocation?: () => void;
  isLocating?: boolean;
}

const DEFAULT_ZOOM = 14;

// Map pin drawn as an SVG path so we can recolour per state without recreating markers.
// Colours come from the design tokens: selected = primary, hover = primary-hover, default = unknown grey.
const PIN_PATH =
  "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z";

// Tokens are read once on the client; the palette is light-mode only (DESIGN.md §4).
let markerColors: { default: string; hover: string; selected: string } | null = null;

function getMarkerColors() {
  if (!markerColors) {
    const root = getComputedStyle(document.documentElement);
    markerColors = {
      default: root.getPropertyValue("--color-unknown").trim(),
      hover: root.getPropertyValue("--color-primary-hover").trim(),
      selected: root.getPropertyValue("--color-primary").trim(),
    };
  }
  return markerColors;
}

function pinIcon(color: string, scale: number): google.maps.Symbol {
  return {
    path: PIN_PATH,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: "#ffffff",
    strokeWeight: 1.5,
    scale,
    anchor: new google.maps.Point(12, 22),
  };
}

type MarkerVisual = { icon: google.maps.Symbol; zIndex: number };

function markerVisual(isSelected: boolean, isHovered: boolean): MarkerVisual {
  const colors = getMarkerColors();
  if (isSelected) return { icon: pinIcon(colors.selected, 1.9), zIndex: 1000 };
  if (isHovered) return { icon: pinIcon(colors.hover, 1.7), zIndex: 500 };
  return { icon: pinIcon(colors.default, 1.4), zIndex: 1 };
}

type MapView = { center: { lat: number; lng: number }; zoom: number };

/**
 * 첫 화면의 중심과 zoom.
 *
 * 앞의 세 단계는 특정 장소를 겨냥하므로 기본 zoom을 쓰고, 마지막 fallback만 다르다.
 * 볼 장소가 정해지지 않은 상태이므로 서비스 범위(대전) 전체가 들어오도록 넓게 잡는다(D-11).
 */
function getInitialView(
  places: PlaceListItem[],
  selectedPlaceId: string | null,
  userLocation?: { lat: number; lng: number } | null,
): MapView {
  if (userLocation) return { center: userLocation, zoom: DEFAULT_ZOOM };
  if (selectedPlaceId) {
    const selected = places.find((p) => p.id === selectedPlaceId);
    if (selected?.location) {
      return { center: selected.location, zoom: DEFAULT_ZOOM };
    }
  }
  const first = places.find((p) => p.location != null);
  if (first?.location) return { center: first.location, zoom: DEFAULT_ZOOM };

  return { center: SERVICE_AREA_CENTER, zoom: SERVICE_AREA_ZOOM };
}

// TODO(map-integration): avoid duplicated map instances for mobile/desktop if needed
export default function MapPanel({
  places,
  selectedPlaceId,
  hoveredPlaceId = null,
  onSelectPlace,
  userLocation,
  onRequestUserLocation,
  isLocating,
}: MapPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const userMarkerRef = useRef<google.maps.Marker | null>(null);

  // Stable refs so effects don't re-run just because callbacks/values were recreated
  const placesRef = useRef(places);
  const selectedPlaceIdRef = useRef(selectedPlaceId);
  const hoveredPlaceIdRef = useRef(hoveredPlaceId);
  const onSelectPlaceRef = useRef(onSelectPlace);
  const userLocationRef = useRef(userLocation);

  placesRef.current = places;
  selectedPlaceIdRef.current = selectedPlaceId;
  hoveredPlaceIdRef.current = hoveredPlaceId;
  onSelectPlaceRef.current = onSelectPlace;
  userLocationRef.current = userLocation;

  const t = useTranslations("places.map");
  const tCommon = useTranslations("common");

  const [mapState, setMapState] = useState<"loading" | "ready" | "error" | "no-key">("loading");
  // 재시도 버튼이 올리는 값. 초기화 effect가 이 값에 의존해 다시 돈다.
  const [loadAttempt, setLoadAttempt] = useState(0);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // Initialize Google Maps once — center priority: userLocation > selectedPlace > first place > service area
  useEffect(() => {
    if (!apiKey) {
      setMapState("no-key");
      return;
    }

    let cancelled = false;

    setOptions({ key: apiKey, v: "weekly" });

    Promise.all([importLibrary("maps"), importLibrary("marker")])
      .then(([{ Map }]) => {
        if (cancelled || !containerRef.current) return;
        try {
          const view = getInitialView(
            placesRef.current,
            selectedPlaceIdRef.current,
            userLocationRef.current,
          );
          const map = new Map(containerRef.current, {
            center: view.center,
            zoom: view.zoom,
          });
          mapRef.current = map;
          setMapState("ready");
        } catch {
          setMapState("error");
        }
      })
      .catch(() => {
        if (!cancelled) setMapState("error");
      });

    return () => {
      cancelled = true;
    };
  }, [apiKey, loadAttempt]);

  // Sync place markers whenever the places list changes
  useEffect(() => {
    if (mapState !== "ready" || !mapRef.current) return;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = new Map();

    const map = mapRef.current;

    places.forEach((place) => {
      if (!place.location) return;
      const visual = markerVisual(
        place.id === selectedPlaceIdRef.current,
        place.id === hoveredPlaceIdRef.current,
      );
      const marker = new google.maps.Marker({
        position: place.location,
        map,
        icon: visual.icon,
        zIndex: visual.zIndex,
      });
      marker.addListener("click", () => onSelectPlaceRef.current(place.id));
      markersRef.current.set(place.id, marker);
    });

    return () => {
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = new Map();
    };
  }, [places, mapState]);

  // Restyle only the affected markers when selection/hover changes — no marker rebuild
  useEffect(() => {
    if (mapState !== "ready") return;
    markersRef.current.forEach((marker, id) => {
      const visual = markerVisual(id === selectedPlaceId, id === hoveredPlaceId);
      marker.setIcon(visual.icon);
      marker.setZIndex(visual.zIndex);
    });
  }, [selectedPlaceId, hoveredPlaceId, mapState, places]);

  // Sync user location marker — managed separately from place markers
  useEffect(() => {
    if (mapState !== "ready" || !mapRef.current) return;

    if (!userLocation) {
      userMarkerRef.current?.setMap(null);
      userMarkerRef.current = null;
      return;
    }

    userMarkerRef.current?.setMap(null);
    userMarkerRef.current = null;

    const marker = new google.maps.Marker({
      position: userLocation,
      map: mapRef.current,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: "#4285F4",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 2,
      },
      clickable: false,
      zIndex: 1000,
    });
    userMarkerRef.current = marker;

    return () => {
      marker.setMap(null);
      userMarkerRef.current = null;
    };
  }, [userLocation, mapState]);

  // Pan to selected place — only when selectedPlaceId changes, never triggered by userLocation
  useEffect(() => {
    if (mapState !== "ready" || !mapRef.current || !selectedPlaceId) return;
    const place = places.find((p) => p.id === selectedPlaceId);
    if (place?.location) {
      mapRef.current.panTo(place.location);
    }
  }, [selectedPlaceId, places, mapState]);

  // Pan to user location — only when userLocation changes, never triggered by selectedPlaceId
  useEffect(() => {
    if (mapState !== "ready" || !mapRef.current || !userLocation) return;
    mapRef.current.panTo(userLocation);
  }, [userLocation, mapState]);

  // 사용자가 위치를 **끈** 경우에만 서비스 지역으로 되돌린다(D-11의 `대전 장소 보기`).
  // 처음부터 위치가 없던 방문은 초기 중심 규칙(선택 장소 → 첫 장소 → 서비스 지역)이 이미
  // 정했으므로 건드리지 않는다. 그래서 값이 있다가 없어진 전환만 본다.
  const hadUserLocationRef = useRef(userLocation != null);
  useEffect(() => {
    if (mapState !== "ready" || !mapRef.current) return;

    const had = hadUserLocationRef.current;
    hadUserLocationRef.current = userLocation != null;
    if (!had || userLocation != null) return;

    mapRef.current.panTo(SERVICE_AREA_CENTER);
    mapRef.current.setZoom(SERVICE_AREA_ZOOM);
  }, [userLocation, mapState]);

  // 키가 없는 것은 설정 문제라 다시 시도해도 결과가 같다. 재시도 버튼을 주지 않는다.
  if (mapState === "no-key") {
    return (
      <div className="w-full h-full bg-surface-subtle flex items-center justify-center p-4">
        <p className="text-sm text-content-secondary text-center">{t("noKey")}</p>
      </div>
    );
  }

  if (mapState === "error") {
    return (
      <div className="w-full h-full bg-surface-subtle flex flex-col items-center justify-center gap-3 p-4">
        <p className="text-sm text-content-secondary text-center">{t("error")}</p>
        <button
          type="button"
          onClick={() => {
            setMapState("loading");
            setLoadAttempt((attempt) => attempt + 1);
          }}
          className="inline-flex h-11 items-center rounded-full border border-border-strong bg-surface px-4 text-sm font-semibold text-content outline-none transition-colors hover:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-ring"
        >
          {tCommon("retry")}
        </button>
      </div>
    );
  }

  const placesWithLocation = places.filter((p) => p.location != null);

  return (
    <div className="w-full h-full relative">
      {mapState === "loading" && (
        <div className="absolute inset-0 bg-surface-subtle flex items-center justify-center z-map-control">
          <p className="text-sm text-content-secondary">{t("loading")}</p>
        </div>
      )}
      {mapState === "ready" && placesWithLocation.length === 0 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none z-map-control">
          <div className="bg-surface rounded-xl border border-border shadow-sm px-4 py-2.5">
            <p className="text-sm text-content-secondary">{t("noCoordinates")}</p>
          </div>
        </div>
      )}

      {/* My location button — absolute positioned to avoid interfering with Google Maps controls */}
      {onRequestUserLocation && (
        <button
          type="button"
          onClick={onRequestUserLocation}
          disabled={isLocating}
          aria-label={t("myLocation")}
          className="absolute bottom-28 right-2 z-map-control w-11 h-11 flex items-center justify-center bg-surface rounded shadow-md hover:bg-surface-subtle active:bg-surface-subtle transition-colors disabled:opacity-60 disabled:cursor-not-allowed lg:bottom-16"
        >
          {isLocating ? (
            <span className="text-sm text-content-muted select-none leading-none">…</span>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-content-secondary"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
            </svg>
          )}
        </button>
      )}

      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
