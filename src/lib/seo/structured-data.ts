import { DAY_KEYS, type OperatingHours } from "@/lib/places/operating-hours";
import { safeHttpUrl } from "@/lib/validation/url";

/**
 * 구조화 데이터는 **확인된 값만** 싣는다.
 *
 * 영업시간·평점·리뷰를 만들어 내지 않는다. 값이 없으면 그 속성을 아예 빼며, 빈 문자열이나
 * 추정치를 채우지 않는다. 검색 결과에 잘못된 사실이 실리면 화면의 `미확인` 표시가 무의미해진다.
 */

const SCHEMA_DAY: Record<(typeof DAY_KEYS)[number], string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

/** 요일이 `null`이면 **휴무**다. 휴무는 규격에 넣지 않고 뺀다. */
function openingHours(hours: OperatingHours | null) {
  if (!hours) return undefined;
  const spec = DAY_KEYS.flatMap((day) => {
    const value = hours[day];
    if (!value) return [];
    return [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: SCHEMA_DAY[day],
        opens: value.open,
        closes: value.close,
      },
    ];
  });
  return spec.length > 0 ? spec : undefined;
}

function geo(location: { lat: number; lng: number } | null) {
  if (!location) return undefined;
  return {
    "@type": "GeoCoordinates",
    latitude: location.lat,
    longitude: location.lng,
  };
}

/** 값이 없는 속성을 지운다. `undefined`가 JSON에 남지 않게 한다. */
function compact<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null));
}

/** 카테고리별 schema.org 타입. 모르면 `LocalBusiness`로 둔다. */
const PLACE_TYPE: Record<string, string> = {
  cafe: "CafeOrCoffeeShop",
  restaurant: "Restaurant",
  travel: "TouristAttraction",
  etc: "LocalBusiness",
};

export function placeJsonLd(params: {
  place: {
    nameKr: string;
    nameEn: string | null;
    category: string;
    address: string;
    phone: string | null;
    website: string | null;
    thumbnailUrl: string | null;
    location: { lat: number; lng: number } | null;
    hours: OperatingHours | null;
  };
  name: string;
  url: string;
}): Record<string, unknown> {
  const { place, name, url } = params;

  return compact({
    "@context": "https://schema.org",
    "@type": PLACE_TYPE[place.category] ?? "LocalBusiness",
    name,
    address: {
      "@type": "PostalAddress",
      streetAddress: place.address,
      addressCountry: "KR",
    },
    telephone: place.phone ?? undefined,
    url,
    sameAs: safeHttpUrl(place.website) ? [safeHttpUrl(place.website)] : undefined,
    image: safeHttpUrl(place.thumbnailUrl) ?? undefined,
    geo: geo(place.location),
    openingHoursSpecification: openingHours(place.hours),
  });
}

export function vetClinicJsonLd(params: {
  clinic: {
    nameKr: string;
    nameEn: string | null;
    address: string;
    phone: string;
    website: string | null;
    location: { lat: number; lng: number } | null;
    hours: OperatingHours | null;
  };
  name: string;
  url: string;
}): Record<string, unknown> {
  const { clinic, name, url } = params;

  return compact({
    "@context": "https://schema.org",
    "@type": "VeterinaryCare",
    name,
    address: {
      "@type": "PostalAddress",
      streetAddress: clinic.address,
      addressCountry: "KR",
    },
    telephone: clinic.phone,
    url,
    sameAs: safeHttpUrl(clinic.website) ? [safeHttpUrl(clinic.website)] : undefined,
    geo: geo(clinic.location),
    openingHoursSpecification: openingHours(clinic.hours),
  });
}

/**
 * `<script type="application/ld+json">` 안에 넣을 문자열.
 *
 * 값에는 운영자가 입력한 이름·주소가 들어간다. `JSON.stringify`는 `<`를 그대로 두므로
 * 이름에 담긴 `</script>`가 스크립트를 끊고 나갈 수 있다. 직렬화 뒤에 한 번 더 막는다.
 * `U+2028`·`U+2029`는 JSON에서는 유효하지만 자바스크립트 소스에서는 줄바꿈이라 함께 막는다.
 */
export function serializeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
