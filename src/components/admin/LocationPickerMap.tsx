"use client";

import { useEffect, useRef, useState } from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { useTranslations } from "next-intl";

const SEOUL_CITY_HALL = { lat: 37.5665, lng: 126.978 };
const DEFAULT_ZOOM = 14;
// TODO(global): expose as a bounds prop when the service expands beyond Korea
const LAT_MIN = 33;
const LAT_MAX = 43;
const LNG_MIN = 124;
const LNG_MAX = 132;

function toValidCoords(
  lat: number | null,
  lng: number | null,
): { lat: number; lng: number } | null {
  if (
    lat === null ||
    lng === null ||
    Number.isNaN(lat) ||
    Number.isNaN(lng) ||
    lat < LAT_MIN ||
    lat > LAT_MAX ||
    lng < LNG_MIN ||
    lng > LNG_MAX
  ) {
    return null;
  }
  return { lat, lng };
}

type LocationPickerMapProps = {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
  disabled?: boolean;
};

export function LocationPickerMap({
  lat,
  lng,
  onChange,
  disabled,
}: LocationPickerMapProps) {
  const t = useTranslations("admin.places.locationPicker");

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);

  // Keep latest onChange/disabled in refs so the init effect doesn't need them as deps
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const disabledRef = useRef(disabled ?? false);
  disabledRef.current = disabled ?? false;

  // Computed once at mount — stable initial center, never changes after mount
  const initialCenterRef = useRef(toValidCoords(lat, lng) ?? SEOUL_CITY_HALL);

  // Tracks the last known marker position to prevent form→map→form feedback loops
  const lastPositionRef = useRef<{ lat: number; lng: number }>(
    initialCenterRef.current,
  );

  const [mapState, setMapState] = useState<
    "loading" | "ready" | "error" | "no-key"
  >("loading");

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // Initialize map once — re-runs only if apiKey changes (effectively once)
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
          const center = initialCenterRef.current;

          const map = new Map(containerRef.current, {
            center,
            zoom: DEFAULT_ZOOM,
          });
          mapRef.current = map;

          const marker = new google.maps.Marker({
            position: center,
            map,
            draggable: !disabledRef.current,
          });
          markerRef.current = marker;
          lastPositionRef.current = center;

          map.addListener("click", (e: google.maps.MapMouseEvent) => {
            if (disabledRef.current || !e.latLng) return;
            const newLat = e.latLng.lat();
            const newLng = e.latLng.lng();
            marker.setPosition({ lat: newLat, lng: newLng });
            lastPositionRef.current = { lat: newLat, lng: newLng };
            onChangeRef.current(newLat, newLng);
          });

          // TODO: migrate to AdvancedMarkerElement once NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID is
          // configured in Google Cloud Console — requires a separate mapId setup task.

          // dragend only — no intermediate updates during drag
          marker.addListener("dragend", () => {
            const pos = marker.getPosition();
            if (!pos) return;
            const newLat = pos.lat();
            const newLng = pos.lng();
            lastPositionRef.current = { lat: newLat, lng: newLng };
            onChangeRef.current(newLat, newLng);
          });

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
      markerRef.current?.setMap(null);
      markerRef.current = null;
      mapRef.current = null;
    };
  }, [apiKey]);

  // Sync disabled prop → marker draggable state when it changes at runtime
  useEffect(() => {
    if (mapState !== "ready" || !markerRef.current) return;
    markerRef.current.setDraggable(!(disabled ?? false));
  }, [disabled, mapState]);

  // Sync form → map: move marker when lat/lng props change
  useEffect(() => {
    if (mapState !== "ready" || !markerRef.current) return;

    const validCoords = toValidCoords(lat, lng);
    if (!validCoords) return;

    const last = lastPositionRef.current;

    // Skip if position hasn't meaningfully changed — prevents feedback loops
    if (
      Math.abs(last.lat - validCoords.lat) < 1e-8 &&
      Math.abs(last.lng - validCoords.lng) < 1e-8
    ) {
      return;
    }

    markerRef.current.setPosition(validCoords);
    mapRef.current?.panTo(validCoords);
    lastPositionRef.current = validCoords;
  }, [lat, lng, mapState]);

  if (mapState === "no-key") {
    return (
      <div className="flex h-64 w-full items-center justify-center rounded border bg-surface-subtle p-4">
        <p className="text-center text-sm text-content-secondary">{t("noKey")}</p>
      </div>
    );
  }

  if (mapState === "error") {
    return (
      <div className="flex h-64 w-full items-center justify-center rounded border bg-surface-subtle p-4">
        <p className="text-center text-sm text-content-secondary">{t("loadFailed")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="relative h-64 w-full overflow-hidden rounded border">
        {mapState === "loading" && (
          <div className="absolute inset-0 z-map-control flex items-center justify-center bg-surface-subtle">
            <p className="text-sm text-content-secondary">{t("loading")}</p>
          </div>
        )}
        <div ref={containerRef} className="h-full w-full" />
      </div>
      {mapState === "ready" && (
        <p className="text-xs text-muted-foreground">{t("clickOrDrag")}</p>
      )}
    </div>
  );
}
