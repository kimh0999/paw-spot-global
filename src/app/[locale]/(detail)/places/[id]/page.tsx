import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getTranslations } from "next-intl/server";
import {
  ArrowLeft,
  BadgeCheck,
  Camera,
  Car,
  Clock,
  Globe,
  History,
  MapPin,
  Navigation,
  Phone,
} from "lucide-react";

import BeforeYouGoCard from "@/components/places/BeforeYouGoCard";
import ConditionStatusIcon from "@/components/places/ConditionStatusIcon";
import DogMatchBadge from "@/components/places/DogMatchBadge";
import FavoriteButton from "@/components/places/FavoriteButton";
import Header from "@/components/Header";
import JsonLd from "@/components/seo/JsonLd";
import PlaceThumb from "@/components/places/PlaceThumb";
import ShareButton from "@/components/places/ShareButton";
import VisitVerdict from "@/components/places/VisitVerdict";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { matchDogsToPlace } from "@/lib/dogs/matching";
import { getUserDogsByIds } from "@/lib/dogs/queries";
import { parseDogSelection } from "@/lib/dogs/selection";
import { formatDistance, haversineDistance } from "@/lib/geo/distance";
import { displayPlaceName, isSupportedLocale } from "@/lib/i18n/locale";
import { safeHttpUrl } from "@/lib/validation/url";
import { getFavoritePlaceIds } from "@/lib/favorites/queries";
import {
  buildConditionRows,
  CORE_CONDITION_COUNT,
} from "@/lib/places/condition-rows";
import { needsRecheck, verificationMethodKey } from "@/lib/places/display";
import { getVisitStatus } from "@/lib/places/eligibility";
import { groupConsecutiveDays } from "@/lib/places/operating-hours";
import { hasUsablePhoto } from "@/lib/places/photo";
import { getPlaceById } from "@/lib/places/queries";
import { noIndexMetadata } from "@/lib/seo/page-metadata";
import { absoluteUrl, alternatesFor } from "@/lib/seo/site";
import { placeJsonLd } from "@/lib/seo/structured-data";
import type { PlaceListItem } from "@/types/place";

/** 범위를 벗어난 값·형식이 틀린 값은 없는 것으로 본다. `places/page.tsx`와 같은 규칙이다. */
function parseCoord(
  value: string | undefined,
  min: number,
  max: number,
): number | undefined {
  if (!value) return undefined;
  const n = parseFloat(value);
  if (!Number.isFinite(n) || n < min || n > max) return undefined;
  return n;
}

/** 사이드바 한 묶음. 상자를 겹겹이 두르지 않고 제목과 구분선으로만 나눈다. */
function AsideBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border pt-4 first:border-t-0 first:pt-0">
      <h2 className="text-xs font-bold uppercase tracking-wide text-content-muted">
        {title}
      </h2>
      <div className="mt-2.5">{children}</div>
    </section>
  );
}

interface Props {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{
    dogId?: string;
    dogIds?: string;
    match?: string;
    /** 목록에서 넘어올 때만 붙는다. 없으면 거리를 표시하지 않는다. */
    lat?: string;
    lng?: string;
  }>;
}

/**
 * 상세 metadata.
 *
 * 조회는 화면과 **같은 `getPlaceById`**를 쓴다 — 공개 조건(`VISIBLE` + 검증 이력 1건 이상)을
 * 통과하지 못한 장소는 여기서도 null이라 비공개 장소의 이름이 metadata로 새어 나가지 않는다.
 *
 * 이름은 `displayPlaceName`이 locale에 맞게 고른다. 영문명이 없으면 한국어명을 그대로 쓰고
 * **번역하지 않는다.**
 */
export async function generateMetadata({
  params: paramsPromise,
}: Props): Promise<Metadata> {
  const { locale, id } = await paramsPromise;
  if (!isSupportedLocale(locale)) return noIndexMetadata;

  const place = await getPlaceById(id);
  if (!place) return noIndexMetadata;

  const t = await getTranslations({ locale, namespace: "seo" });
  const name = displayPlaceName(place, locale).primary;
  const path = `/places/${place.id}`;
  const description = t("placeDetail.description", { name });

  return {
    title: name,
    description,
    alternates: alternatesFor(locale, path),
    openGraph: {
      type: "website",
      siteName: t("siteName"),
      locale,
      url: absoluteUrl(locale, path),
      title: `${name} · ${t("siteName")}`,
      description,
    },
    twitter: { card: "summary", title: `${name} · ${t("siteName")}`, description },
  };
}

export default async function PlaceDetailPage({
  params: paramsPromise,
  searchParams: searchParamsPromise,
}: Props) {
  // Next 15부터 params/searchParams는 Promise다. 기존 참조를 그대로 두기 위해 풀어서 같은 이름에 담는다.
  const [params, searchParams] = await Promise.all([paramsPromise, searchParamsPromise]);
  const { locale, id } = params;
  const safeLocale = isSupportedLocale(locale) ? locale : "en";

  const place = await getPlaceById(id);
  if (!place) notFound();

  // 목록에서 반려견을 고른 채 들어오면 상세에서도 같은 기준으로 판정한다.
  // 확인되지 않은 dogId는 판정 없이 조용히 지나간다.
  const user = await getCurrentUser();
  const selectedDogs = user
    ? await getUserDogsByIds(user.id, parseDogSelection(searchParams).dogIds)
    : [];
  const favoritePlaceIds = user ? await getFavoritePlaceIds(user.id) : [];
  const isFavorite = favoritePlaceIds.includes(place.id);

  const dogMatch = matchDogsToPlace(selectedDogs, {
    indoor: place.condition?.indoor ?? null,
    maxDogSize: place.condition?.maxDogSize ?? null,
    breedRestrictions: place.condition?.breedRestrictions ?? null,
    policyDetails: place.condition?.policyDetails ?? null,
  });

  const t = await getTranslations({ locale: safeLocale, namespace: "places.detail" });
  const tCard = await getTranslations({ locale: safeLocale, namespace: "places.card" });

  const { primary: placeName, secondary: placeNameSecondary } = displayPlaceName(
    place,
    safeLocale,
  );

  const categoryLabel =
    place.category === "cafe"
      ? tCard("category.cafe")
      : place.category === "restaurant"
        ? tCard("category.restaurant")
        : place.category === "travel"
          ? tCard("category.travel")
          : place.category.toUpperCase();

  // 목록·카드와 같은 판정을 쓴다. 기준이 되는 확인일도 같은 `formatVerifiedAt` 결과다.
  // 여기서 90일을 다시 세지 않는다 — 화면마다 경계가 갈라지면 같은 장소가 다르게 보인다.
  const showRecheckBadge =
    place.latestVerification != null &&
    needsRecheck(place.latestVerification.verifiedAt, new Date());

  const googleMapsUrl =
    place.location != null
      ? `https://www.google.com/maps/search/?api=1&query=${place.location.lat},${place.location.lng}`
      : null;

  // 목록에서 위치를 갖고 들어온 경우에만 거리를 낸다. 위치가 없으면 표시하지 않는다
  // (개발명세서 v2 §7-2 — 좌표 fallback은 지도 중심에만 쓴다).
  const userLat = parseCoord(searchParams.lat, -90, 90);
  const userLng = parseCoord(searchParams.lng, -180, 180);
  const distanceText =
    userLat != null && userLng != null && place.location != null
      ? formatDistance(
          haversineDistance(userLat, userLng, place.location.lat, place.location.lng),
          safeLocale,
        )
      : null;

  /**
   * 목록·카드와 **같은 판정 함수**를 쓰기 위해 상세의 조건을 목록 항목 모양으로 맞춘다.
   * 판정 로직을 이 화면에서 다시 쓰지 않는다 — 다시 쓰면 같은 장소가 화면마다 달라진다.
   */
  const judgmentInput: PlaceListItem = {
    id: place.id,
    nameKr: place.nameKr,
    nameEn: place.nameEn,
    category: place.category,
    address: place.address,
    phone: place.phone,
    location: place.location,
    distanceMeters: null,
    thumbnailUrl: place.thumbnailUrl,
    // 판정은 사진을 보지 않는다. 모양을 맞추기 위한 값이다.
    imageAttribution: place.imageAttribution,
    indoor: place.condition?.indoor ?? null,
    carrierStrollerPolicy: place.condition?.carrierStrollerPolicy ?? null,
    maxDogSize: place.condition?.maxDogSize ?? null,
    leash: place.condition?.leash ?? null,
    muzzle: place.condition?.muzzle ?? null,
    breedRestrictions: place.condition?.breedRestrictions ?? null,
    policyDetails: place.condition?.policyDetails ?? null,
    caution: place.condition?.cautions ?? null,
    latestVerifiedAt: place.latestVerification?.verifiedAt ?? null,
    verificationMethod: place.latestVerification?.method ?? null,
  };
  const visitStatus = getVisitStatus(judgmentInput, "all");

  const tBeforeYouGo = await getTranslations({
    locale: safeLocale,
    namespace: "places.detail.beforeYouGo",
  });
  // 아래 전체 표와 같은 함수에서 만든다. 요약과 표가 다른 말을 하지 않게 하기 위해서다.
  const coreConditions = buildConditionRows(place.condition, tBeforeYouGo).slice(
    0,
    CORE_CONDITION_COUNT,
  );

  // 확인 방식은 저장된 영어 라벨이라 그대로 두면 한국어 화면에 `Phone`이 남는다.
  const methodKey = verificationMethodKey(place.latestVerification?.method ?? null);

  // 공유에는 사용자 좌표가 붙지 않은 정규 경로를 넘긴다.
  const canonicalPath = `/${safeLocale}/places/${place.id}`;
  // 사진 자리를 만들지 말지는 카드와 같은 판정을 쓴다 — 예시 주소면 자리 자체를 두지 않는다.
  const hasPhoto = hasUsablePhoto(place.thumbnailUrl);
  // 저장된 홈페이지 주소가 http/https가 아니면 링크로 만들지 않는다. 스킴 검사를
  // 넣기 전에 들어간 행이 남아 있을 수 있어서, 화면에서도 한 번 더 본다.
  const websiteHref = safeHttpUrl(place.website);
  const hasContact = place.phone || websiteHref || place.instagram;
  const hasParking = place.parking !== "UNKNOWN" || Boolean(place.parkingNote);

  /**
   * 장소 소개를 어느 언어로 보여줄까.
   *
   * 영어 화면에서 영문 소개가 없으면 **한국어 원문임을 밝히고** 보여준다.
   * 한국어 글을 아무 표시 없이 내보내면 영문 설명이 있는 것처럼 읽힌다.
   */
  /** 소개·이용 안내를 어느 언어로 보여줄지 같은 규칙으로 고른다. */
  const pickText = (kr: string | null, en: string | null) =>
    safeLocale === "en"
      ? en
        ? { text: en, isKoreanSource: false }
        : kr
          ? { text: kr, isKoreanSource: true }
          : null
      : kr
        ? { text: kr, isKoreanSource: false }
        : null;

  const usageGuide = pickText(place.usageGuideKr, place.usageGuideEn);

  const description =
    safeLocale === "en"
      ? place.descriptionEn
        ? { text: place.descriptionEn, isKoreanSource: false }
        : place.descriptionKr
          ? { text: place.descriptionKr, isKoreanSource: true }
          : null
      : place.descriptionKr
        ? { text: place.descriptionKr, isKoreanSource: false }
        : null;

  return (
    <>
      <JsonLd
        data={placeJsonLd({
          place,
          name: displayPlaceName(place, safeLocale).primary,
          url: absoluteUrl(safeLocale, `/places/${place.id}`),
        })}
      />
      {/* 상세도 공통 헤더를 갖는다. 없으면 사용자는 뒤로 가기 말고 이동할 길을 잃는다
          (DESIGN.md §5 Header와 main의 소유 위치). */}
      <Header />

      <main id="main-content" tabIndex={-1} className="bg-surface-page pb-16">
        <div className="mx-auto max-w-[1200px] px-4 py-5 sm:px-6">
          <Link
            href="/places"
            className="inline-flex h-11 items-center gap-1.5 rounded-md text-sm font-semibold text-content-secondary outline-none transition-colors hover:text-content focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
            {t("back")}
          </Link>

          {/*
            장소 머리말 — 이름·위치·확인 기록·행동, 그리고 **핵심 방문 조건**을 한 덩어리로 묶는다.
            오른쪽을 비워 두거나 사진으로만 채우지 않는다. 이 화면에 온 이유가 방문 판단이라
            그 판단이 머리말 안에서 시작되어야 한다.
          */}
          <div className="mt-2 overflow-hidden rounded-card border border-border bg-surface">
            {hasPhoto && (
              <PlaceThumb
                category={place.category}
                src={place.thumbnailUrl}
                alt={placeName}
                attribution={place.imageAttribution}
                creditVariant="block"
                className="aspect-[21/6] w-full"
              />
            )}
            <div className="gap-8 p-5 sm:p-6 lg:flex lg:items-start">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-primary">{categoryLabel}</p>
              <h1 className="mt-1 text-2xl font-bold leading-tight text-content sm:text-3xl">
                {placeName}
              </h1>
              {placeNameSecondary && (
                <p className="mt-1 text-base text-content-secondary">{placeNameSecondary}</p>
              )}

              <p className="mt-3 flex items-start gap-1.5 text-sm text-content-secondary">
                <MapPin
                  className="mt-0.5 h-4 w-4 shrink-0"
                  strokeWidth={2}
                  aria-hidden="true"
                />
                <span>
                  {place.address}
                  {distanceText && (
                    <>
                      <span aria-hidden="true"> · </span>
                      <span className="font-semibold tabular-nums text-content">
                        {t("actions.distanceFromYou", { distance: distanceText })}
                      </span>
                    </>
                  )}
                </span>
              </p>

              {place.latestVerification && (
                <p
                  className={`mt-1.5 flex items-center gap-1.5 text-sm ${
                    showRecheckBadge ? "text-warning" : "text-content-secondary"
                  }`}
                >
                  {showRecheckBadge ? (
                    <History className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" />
                  ) : (
                    <BadgeCheck
                      className="h-4 w-4 shrink-0"
                      strokeWidth={2}
                      aria-hidden="true"
                    />
                  )}
                  {tCard("verifiedAt")} {place.latestVerification.verifiedAt}
                  {/* 신선도 경고다. 동반 불가 판정으로 읽히지 않도록 danger가 아닌 amber를 쓴다
                      (DESIGN.md §7 Stale verification). */}
                  {showRecheckBadge && <span>· {tCard("staleBadge")}</span>}
                </p>
              )}

              {/* 액션 (DESIGN.md §6 표시 순서 3). 길찾기가 primary, 전화·공유는 secondary다.
                  값이 없는 액션은 비활성 버튼을 두지 않고 아예 그리지 않는다. */}
              <div className="mt-5 flex flex-wrap items-center gap-2">
                {googleMapsUrl && (
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground outline-none transition-colors hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <Navigation className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                    {t("actions.directions")}
                  </a>
                )}
                {place.phone && (
                  <a
                    href={`tel:${place.phone}`}
                    className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg border border-border-control bg-surface px-4 text-sm font-semibold text-content outline-none transition-colors hover:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Phone className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                    {t("actions.call")}
                  </a>
                )}
                <ShareButton path={canonicalPath} title={placeName} />
                <FavoriteButton
                  placeId={place.id}
                  initialFavorite={isFavorite}
                  className="h-11 w-11 shrink-0"
                />
              </div>
            </div>

            {/*
              핵심 방문 조건 — 입장을 가르는 셋만 머리말에 올린다. 아래 전체 표와 **같은
              함수·같은 문구**를 쓰므로 요약에서 자세한 조건으로 넘어갈 때 뜻이 달라지지 않는다.
            */}
            {coreConditions.length > 0 && (
              <div className="mt-6 shrink-0 rounded-panel bg-surface-page p-4 lg:mt-0 lg:w-[300px]">
                <VisitVerdict status={visitStatus} />
                <dl className="mt-3 space-y-2 border-t border-border pt-3">
                  {coreConditions.map((row) => (
                    <div key={row.key}>
                      <dt className="text-xs text-content-secondary">{row.label}</dt>
                      <dd className="mt-0.5 flex items-start gap-2 text-sm font-medium text-content">
                        <ConditionStatusIcon status={row.status} className="mt-0.5" />
                        <span className="min-w-0">{row.value}</span>
                      </dd>
                    </div>
                  ))}
                </dl>
                <a
                  href="#before-you-go-title"
                  className="mt-3 inline-flex h-11 items-center rounded-md text-sm font-semibold text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {t("seeAllConditions")}
                </a>
              </div>
            )}
            </div>
          </div>

          {dogMatch && (
            <DogMatchBadge
              status={dogMatch.status}
              reason={dogMatch.reason}
              dogName={selectedDogs.length === 1 ? selectedDogs[0].name : null}
              className="mt-5"
            />
          )}

          {/*
            본문 2열 — 왼쪽은 **방문 여부를 판단하는 정보**, 오른쪽은 가기로 정한 뒤에
            필요한 실용 정보다. 좁은 폭에서는 판단이 먼저 오도록 한 열로 접힌다.
          */}
          <div className="mt-8 gap-10 lg:flex lg:items-start">
            <div className="min-w-0 flex-1">
              {description && (
                <section className="mb-8">
                  <h2 className="text-base font-semibold text-content">
                    {t("about.title")}
                  </h2>
                  {/*
                    영문 소개가 없어 한국어 원문을 보여줄 때는 그렇다고 적는다.
                    표시하지 않으면 영문 설명이 있는 것처럼 읽힌다.
                  */}
                  {description.isKoreanSource && (
                    <p className="mt-1 text-xs text-content-muted">
                      {t("about.koreanSource")}
                    </p>
                  )}
                  <p
                    className="mt-2 whitespace-pre-line text-sm leading-relaxed text-content-secondary"
                    lang={description.isKoreanSource ? "ko" : undefined}
                  >
                    {description.text}
                  </p>
                </section>
              )}
              <BeforeYouGoCard condition={place.condition} locale={safeLocale} />
              <p className="mt-5 text-xs text-content-muted">{t("disclaimer")}</p>
            </div>

            <aside className="mt-10 shrink-0 space-y-5 rounded-card border border-border bg-surface p-5 lg:mt-0 lg:w-[320px]">
              <AsideBlock title={t("hours.title")}>
                {place.hours ? (
                  <dl className="space-y-1">
                    {groupConsecutiveDays(place.hours).map((group) => (
                      <div key={group.days.join("-")} className="flex gap-3 text-sm">
                        <dt className="w-20 shrink-0 text-content-secondary">
                          {group.days.length > 1
                            ? `${t(`hours.days.${group.days[0]}`)}–${t(`hours.days.${group.days[group.days.length - 1]}`)}`
                            : t(`hours.days.${group.days[0]}`)}
                        </dt>
                        <dd className="tabular-nums text-content">
                          {group.hours
                            ? `${group.hours.open}–${group.hours.close}`
                            : t("hours.closed")}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  // 미등록은 사실대로 말하되 한 줄로 끝낸다. 없는 정보에 큰 자리를 주지 않는다.
                  <p className="flex items-center gap-1.5 text-sm text-content-muted">
                    <Clock className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" />
                    {t("hours.notProvided")}
                  </p>
                )}
                {place.hoursNote && (
                  <p className="mt-1.5 text-sm text-content-secondary">{place.hoursNote}</p>
                )}
                {/*
                  요일별 시간으로 옮길 수 없는 안내 — 계절별·시설별 시간, `상시 개방`,
                  복잡한 휴무 규칙. **범위를 지우지 않고** 원문 그대로 보여 준다.
                */}
                {usageGuide && (
                  <div className="mt-3 border-t border-border pt-3">
                    <p className="text-xs font-medium text-content-secondary">
                      {t("usageGuide.title")}
                    </p>
                    {usageGuide.isKoreanSource && (
                      <p className="mt-1 text-xs text-content-muted">{t("about.koreanSource")}</p>
                    )}
                    <p
                      className="mt-1 whitespace-pre-line text-sm text-content-secondary"
                      lang={usageGuide.isKoreanSource ? "ko" : undefined}
                    >
                      {usageGuide.text}
                    </p>
                  </div>
                )}
              </AsideBlock>

              {(hasContact || hasParking) && (
                <AsideBlock title={t("info.title")}>
                  <ul className="space-y-2">
                    {hasParking && (
                      <li className="flex items-center gap-2">
                        <Car
                          className="h-4 w-4 shrink-0 text-content-muted"
                          strokeWidth={2}
                          aria-hidden="true"
                        />
                        <span className="text-sm text-content">
                          {place.parking === "UNKNOWN"
                            ? t("parking.unknown")
                            : t(`parking.${place.parking === "AVAILABLE" ? "available" : "unavailable"}`)}
                          {place.parkingNote ? ` · ${place.parkingNote}` : ""}
                        </span>
                      </li>
                    )}
                    {place.phone && (
                      <li className="flex items-center gap-2">
                        <Phone
                          className="h-4 w-4 shrink-0 text-content-muted"
                          strokeWidth={2}
                          aria-hidden="true"
                        />
                        <a
                          href={`tel:${place.phone}`}
                          className="rounded text-sm text-content outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {place.phone}
                        </a>
                      </li>
                    )}
                    {websiteHref && (
                      <li className="flex items-center gap-2">
                        <Globe
                          className="h-4 w-4 shrink-0 text-content-muted"
                          strokeWidth={2}
                          aria-hidden="true"
                        />
                        <a
                          href={websiteHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate rounded text-sm text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {t("info.website")}
                        </a>
                      </li>
                    )}
                    {place.instagram && (
                      <li className="flex items-center gap-2">
                        <Camera
                          className="h-4 w-4 shrink-0 text-content-muted"
                          strokeWidth={2}
                          aria-hidden="true"
                        />
                        <a
                          href={`https://instagram.com/${place.instagram.replace(/^@/, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate rounded text-sm text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          @{place.instagram.replace(/^@/, "")}
                        </a>
                      </li>
                    )}
                  </ul>
                </AsideBlock>
              )}

              <AsideBlock title={t("verification.title")}>
                {place.latestVerification ? (
                  <dl className="space-y-2 text-sm">
                    <div className="flex gap-3">
                      <dt className="w-24 shrink-0 text-content-secondary">
                        {t("verification.lastVerified")}
                      </dt>
                      <dd className="flex flex-wrap items-center gap-1.5 tabular-nums text-content">
                        {place.latestVerification.verifiedAt}
                        {showRecheckBadge && (
                          <span className="inline-flex items-center gap-1 rounded-sm bg-warning-soft px-1.5 py-0.5 text-xs font-semibold text-warning">
                            <History className="h-3 w-3 shrink-0" aria-hidden="true" />
                            {tCard("staleBadge")}
                          </span>
                        )}
                      </dd>
                    </div>
                    <div className="flex gap-3">
                      <dt className="w-24 shrink-0 text-content-secondary">
                        {t("verification.method")}
                      </dt>
                      <dd className="text-content">
                        {methodKey
                          ? tCard(`verificationPath.${methodKey}`)
                          : place.latestVerification.method}
                      </dd>
                    </div>
                    {place.latestVerification.note && (
                      <div className="flex gap-3">
                        <dt className="w-24 shrink-0 text-content-secondary">
                          {t("verification.note")}
                        </dt>
                        <dd className="min-w-0 text-content">
                          {place.latestVerification.note}
                        </dd>
                      </div>
                    )}
                  </dl>
                ) : (
                  <p className="text-sm text-content-muted">
                    {t("verification.notVerified")}
                  </p>
                )}
              </AsideBlock>
            </aside>
          </div>
        </div>
      </main>
    </>
  );
}
