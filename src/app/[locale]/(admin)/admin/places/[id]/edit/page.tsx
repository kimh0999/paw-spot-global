import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { PlaceForm } from "@/components/admin/PlaceForm";
import { Link } from "@/i18n/navigation";
import { isSupportedLocale } from "@/lib/i18n/locale";
import { getAdminPlaceById } from "@/lib/places/queries";

import { updatePlace } from "./actions";

interface Props {
  params: { locale: string; id: string };
}

export default async function AdminPlaceEditPage({ params }: Props) {
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
    },
    verification: place.latestVerification
      ? {
          method: place.latestVerification.method,
          verifiedAt: place.latestVerification.verifiedAt,
          note: place.latestVerification.note ?? undefined,
        }
      : undefined,
  };

  const successContent = (
    <div className="rounded border border-green-500 p-4">
      <p className="font-medium text-green-700">{t("saveSuccess")}</p>
      <Link
        href="/admin/places"
        className="mt-2 inline-block text-sm text-blue-600 hover:underline"
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
          className="shrink-0 text-sm text-gray-500 hover:text-gray-800 transition-colors"
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
