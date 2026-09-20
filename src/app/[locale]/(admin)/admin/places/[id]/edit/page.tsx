import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { PlaceForm } from "@/components/admin/PlaceForm";
import { Link } from "@/i18n/navigation";
import { isSupportedLocale } from "@/lib/i18n/locale";
import { getAdminPlaceById } from "@/lib/places/queries";

import { updatePlace } from "./actions";

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

export default async function AdminPlaceEditPage({ params: paramsPromise }: Props) {
  // Next 15부터 params/searchParams는 Promise다. 기존 참조를 그대로 두기 위해 풀어서 같은 이름에 담는다.
  const params = await paramsPromise;
  const { id } = params;
  const safeLocale = isSupportedLocale(params.locale) ? params.locale : "en";
  const t = await getTranslations({ locale: safeLocale, namespace: "admin.places" });

  const place = await getAdminPlaceById(id);
  if (!place) notFound();

  const boundAction = updatePlace.bind(null, safeLocale, id);

  const initialValues = {
    nameKr: place.nameKr,
    nameEn: place.nameEn ?? undefined,
    category: place.category,
    address: place.address,
    lat: place.lat ?? undefined,
    lng: place.lng ?? undefined,
    phone: place.phone ?? undefined,
    website: place.website ?? undefined,
    instagram: place.instagram ?? undefined,
    thumbnailUrl: place.thumbnailUrl ?? undefined,
    // 출처 기록은 저장된 그대로 넘긴다. 공개 화면과 달리 감추면 고칠 수가 없다(D-22).
    imageAttribution: place.imageAttribution,
    imageAttributionStatus: place.imageAttributionStatus,
    imageAttributionMissing: place.imageAttributionMissing,
    hours: place.hours,
    hoursNote: place.hoursNote,
    descriptionKr: place.descriptionKr,
    descriptionEn: place.descriptionEn,
    parking: place.parking,
    parkingNote: place.parkingNote,
    usageGuideKr: place.usageGuideKr,
    usageGuideEn: place.usageGuideEn,
    tourApiId: place.tourApiId ?? undefined,
    visibility: place.visibility,
    condition: place.condition ?? {
      indoor: "UNKNOWN",
      carrierStrollerPolicy: "UNKNOWN",
      maxDogSize: "UNKNOWN",
      leash: "UNKNOWN",
      muzzle: "UNKNOWN",
      vaccinationCertificatePolicy: "UNKNOWN",
      breedRestrictions: undefined,
      requiredItems: [],
      cautions: undefined,
      policyDetails: { status: "empty", value: null } as const,
    },
    verification: place.latestVerification
      ? {
          method: place.latestVerification.method,
          verifiedAt: place.latestVerification.verifiedAt,
          note: place.latestVerification.note ?? undefined,
          rawPolicyText: place.latestVerification.rawPolicyText ?? undefined,
          sourceLanguages: place.latestVerification.sourceLanguages,
          sourceUrl: place.latestVerification.sourceUrl ?? undefined,
        }
      : undefined,
  };

  const successContent = (
    <div className="rounded border border-success p-4">
      <p className="font-medium text-success">{t("saveSuccess")}</p>
      <Link
        href="/admin/places"
        className="mt-2 inline-block text-sm text-primary hover:underline"
      >
        {t("backToList")}
      </Link>
    </div>
  );

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("editTitle")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("editDescription")}</p>
        </div>
        <Link
          href="/admin/places"
          className="shrink-0 text-sm text-content-secondary hover:text-content transition-colors"
        >
          ← {t("backToList")}
        </Link>
      </div>

      <PlaceForm
        action={boundAction}
        mode="edit"
        initialValues={initialValues}
        submitLabel={t("saveChanges")}
        successContent={successContent}
      />
    </main>
  );
}
