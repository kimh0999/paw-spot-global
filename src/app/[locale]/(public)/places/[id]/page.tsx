import { notFound } from "next/navigation";

import { getTranslations } from "next-intl/server";
import {
  ArrowLeft,
  BadgeCheck,
  Camera,
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
  params: { locale: string; id: string };
  searchParams: {
    dogId?: string;
    dogIds?: string;
    match?: string;
    /** 목록에서 넘어올 때만 붙는다. 없으면 거리를 표시하지 않는다. */
    lat?: string;
    lng?: string;
  };
}

export default async function PlaceDetailPage({ params, searchParams }: Props) {
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
  const hasContact = place.phone || place.website || place.instagram;

  return (
    <>
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
              </AsideBlock>

              {hasContact && (
                <AsideBlock title={t("info.title")}>
                  <ul className="space-y-2">
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
                    {place.website && (
                      <li className="flex items-center gap-2">
                        <Globe
                          className="h-4 w-4 shrink-0 text-content-muted"
                          strokeWidth={2}
                          aria-hidden="true"
                        />
                        <a
                          href={place.website}
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
