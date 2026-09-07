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

  /**
   * 주소에서 위치를 걷어낸다 — 서비스 범위 밖 사용자의 `대전 장소 보기`(D-11).
   *
   * 사용자가 허용한 위치를 말없이 무시하지 않고, 이 버튼을 눌렀을 때만 지운다.
   * 거리순 정렬도 함께 되돌린다 — 기준이 되는 위치가 사라진 뒤에도 남아 있으면
   * 정렬 이름과 실제 결과가 어긋난다.
   */
  const clearLocation = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("lat");
    params.delete("lng");
    if (params.get("sort") === "distance") params.delete("sort");

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  return {
    isLocating,
    locationDenied,
    locationBlocked,
    hasLocationInUrl,
    handleMyLocation,
    clearLocation,
  };
}
