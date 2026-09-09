"use client";

import { useEffect, useRef, useState } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { useTranslations } from "next-intl";
import { LoaderCircle, LocateFixed, MapPinned } from "lucide-react";

import {
  SERVICE_AREA_CENTER,
  SERVICE_AREA_ZOOM,
} from "@/lib/places/service-area";
import type { PlaceListItem } from "@/types/place";

declare global {
  interface Window {
    /** Maps SDK가 인증·결제 거부 시 부르는 전역 콜백. 이름은 SDK가 정한다. */
    gm_authFailure?: () => void;
  }
}

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
let markerColors: {
  default: string;
  hover: string;
  selected: string;
  userLocation: string;
} | null = null;

function getMarkerColors() {
  if (!markerColors) {
    const root = getComputedStyle(document.documentElement);
    markerColors = {
      default: root.getPropertyValue("--color-unknown").trim(),
      hover: root.getPropertyValue("--color-text").trim(),
      selected: root.getPropertyValue("--color-primary").trim(),
      userLocation: root.getPropertyValue("--color-user-location").trim(),
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

  const [mapState, setMapState] = useState<
    "loading" | "ready" | "error" | "no-key" | "auth-error"
  >("loading");
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

    /**
     * 인증·결제 거부는 Promise로 오지 않는다. Maps SDK는 스크립트를 정상적으로 내려준 뒤
     * 콘솔에만 이유를 적고(예: BillingNotEnabledMapError) 타일 없는 회색 판을 남긴다.
     * SDK가 그럴 때 부르는 전역 콜백을 걸어, 설명 없는 회색 화면 대신 사실을 알린다.
     * 오류를 가리는 것이 아니라 **무엇이 필요한지 말하는** 처리다.
     */
    window.gm_authFailure = () => {
      if (!cancelled) setMapState("auth-error");
    };

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
        scale: 9,
        // 선택한 장소 마커(브랜드색)와 반드시 구분돼야 해서 별도 토큰을 쓴다.
        fillColor: getMarkerColors().userLocation,
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

  // 키가 없는 것도, 키가 거부된 것도 설정 문제라 다시 시도해도 결과가 같다.
  // 재시도 버튼을 주지 않고 무엇이 막혔는지만 말한다. 목록은 그대로 쓸 수 있다.
  if (mapState === "no-key" || mapState === "auth-error") {
    return (
      <div className="flex h-full w-full items-center justify-center bg-surface-page p-6">
        <div className="max-w-sm text-center">
          <MapPinned
            className="mx-auto h-6 w-6 text-content-muted"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <p className="mt-3 text-sm text-content-secondary">
            {mapState === "no-key" ? t("noKey") : t("authError")}
          </p>
          <p className="mt-1 text-xs text-content-muted">{t("listStillAvailable")}</p>
        </div>
      </div>
    );
  }

  if (mapState === "error") {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-surface-page p-6">
        <p className="text-center text-sm text-content-secondary">{t("error")}</p>
        <button
          type="button"
          onClick={() => {
            setMapState("loading");
            setLoadAttempt((attempt) => attempt + 1);
          }}
          className="inline-flex h-11 items-center rounded-lg border border-border-control bg-surface px-4 text-sm font-semibold text-content outline-none transition-colors hover:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-ring"
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
        <div className="absolute inset-0 z-map-control flex items-center justify-center bg-surface-page">
          <p className="text-sm text-content-secondary">{t("loading")}</p>
        </div>
      )}
      {mapState === "ready" && placesWithLocation.length === 0 && (
        <div className="pointer-events-none absolute bottom-6 left-1/2 z-map-control -translate-x-1/2">
          {/* 지도 위에 떠 있는 요소라 그림자를 쓴다 (DESIGN.md §4 그림자 기준) */}
          <div className="rounded-panel border border-border bg-surface px-4 py-2.5 shadow-md">
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
          className="absolute bottom-28 right-3 z-map-control flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-surface text-content-secondary shadow-md outline-none transition-colors hover:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60 lg:bottom-6"
        >
          {isLocating ? (
            <LoaderCircle
              className="h-5 w-5 animate-spin motion-reduce:animate-none"
              strokeWidth={2}
              aria-hidden="true"
            />
          ) : (
            <LocateFixed className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
          )}
        </button>
      )}

      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
