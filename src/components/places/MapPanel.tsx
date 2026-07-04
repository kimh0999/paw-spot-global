"use client";

import { useEffect, useRef, useState } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

import type { PlaceListItem } from "@/types/place";

interface MapPanelProps {
  places: PlaceListItem[];
  selectedPlaceId: string | null;
  hoveredPlaceId?: string | null;
  onSelectPlace: (id: string) => void;
  placeholder?: string;
  userLocation?: { lat: number; lng: number } | null;
  onRequestUserLocation?: () => void;
  isLocating?: boolean;
}

const SEOUL_CITY_HALL = { lat: 37.5665, lng: 126.978 };
const DEFAULT_ZOOM = 14;

// Map pin drawn as an SVG path so we can recolour per state without recreating markers.
// Selection = blue, hover = emphasised orange, default = brand orange.
const PIN_PATH =
  "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z";

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
  if (isSelected) return { icon: pinIcon("#2563eb", 1.9), zIndex: 1000 };
  if (isHovered) return { icon: pinIcon("#ea580c", 1.7), zIndex: 500 };
  return { icon: pinIcon("#fb923c", 1.4), zIndex: 1 };
}

function getInitialCenter(
  places: PlaceListItem[],
  selectedPlaceId: string | null,
  userLocation?: { lat: number; lng: number } | null,
): { lat: number; lng: number } {
  if (userLocation) return userLocation;
  if (selectedPlaceId) {
    const selected = places.find((p) => p.id === selectedPlaceId);
    if (selected?.location) return selected.location;
  }
  const first = places.find((p) => p.location != null);
  if (first?.location) return first.location;
  return SEOUL_CITY_HALL;
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

  const [mapState, setMapState] = useState<"loading" | "ready" | "error" | "no-key">("loading");

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // Initialize Google Maps once — center priority: userLocation > selectedPlace > first place > Seoul
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
          const center = getInitialCenter(
            placesRef.current,
            selectedPlaceIdRef.current,
            userLocationRef.current,
          );
          const map = new Map(containerRef.current, {
            center,
            zoom: DEFAULT_ZOOM,
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
  }, [apiKey]);

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

  if (mapState === "no-key") {
    return (
      <div className="w-full h-full bg-gray-100 flex items-center justify-center p-4">
        <p className="text-sm text-gray-500 text-center">
          Map is unavailable. Please check Google Maps API key.
        </p>
      </div>
    );
  }

  if (mapState === "error") {
    return (
      <div className="w-full h-full bg-gray-100 flex items-center justify-center p-4">
        <p className="text-sm text-gray-500 text-center">
          Map failed to load. Please try again later.
        </p>
      </div>
    );
  }

  const placesWithLocation = places.filter((p) => p.location != null);

  return (
    <div className="w-full h-full relative">
      {mapState === "loading" && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
          <p className="text-sm text-gray-500">Loading map...</p>
        </div>
      )}
      {mapState === "ready" && placesWithLocation.length === 0 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none z-10">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-2.5">
            <p className="text-sm text-gray-500">
              No places with coordinates to show on the map.
            </p>
          </div>
        </div>
      )}

      {/* My location button — absolute positioned to avoid interfering with Google Maps controls */}
      {onRequestUserLocation && (
        <button
          type="button"
          onClick={onRequestUserLocation}
          disabled={isLocating}
          aria-label="Move to my location"
          className="absolute bottom-16 right-2 z-10 w-11 h-11 flex items-center justify-center bg-white rounded shadow-md hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isLocating ? (
            <span className="text-sm text-gray-400 select-none leading-none">…</span>
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
              className="text-gray-600"
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
