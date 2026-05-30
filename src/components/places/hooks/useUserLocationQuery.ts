"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function useUserLocationQuery() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const [isLocating, setIsLocating] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);
  const [locationBlocked, setLocationBlocked] = useState(false);

  const hasLocationInUrl = useMemo(
    () => searchParams.get("lat") !== null && searchParams.get("lng") !== null,
    [searchParams],
  );

  const handleMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationDenied(true);
      return;
    }

    const wasAlreadyDenied = locationDenied;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        setLocationDenied(false);
        setLocationBlocked(false);
        const { latitude, longitude } = position.coords;
        const params = new URLSearchParams(searchParams.toString());
        params.set("lat", String(latitude));
        params.set("lng", String(longitude));
        params.set("sort", "distance");
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      },
      (err) => {
        setIsLocating(false);
        if (wasAlreadyDenied || err.code === 1) {
          setLocationBlocked(true);
          setLocationDenied(false);
        } else {
          setLocationDenied(true);
        }
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
    );
  }, [locationDenied, pathname, router, searchParams]);

  return {
    isLocating,
    locationDenied,
    locationBlocked,
    hasLocationInUrl,
    handleMyLocation,
  };
}
