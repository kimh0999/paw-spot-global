type Router = { push: (url: string) => void };

export function navigateToNearbyPlaces(
  router: Router,
  onStart: () => void,
  onEnd: () => void,
): void {
  if (!navigator.geolocation) {
    router.push("/places");
    return;
  }
  onStart();
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      onEnd();
      router.push(
        `/places?lat=${coords.latitude}&lng=${coords.longitude}&sort=distance`,
      );
    },
    () => {
      onEnd();
      router.push("/places");
    },
    { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
  );
}
