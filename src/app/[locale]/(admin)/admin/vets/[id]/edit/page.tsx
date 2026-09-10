import { notFound } from "next/navigation";

import VetClinicForm, { type VetClinicFormValues } from "@/components/admin/VetClinicForm";
import { readOperatingHours } from "@/lib/places/operating-hours";
import { getVetClinicForAdmin } from "@/lib/vets/queries";
import { updateVetClinicAction } from "../../actions";

interface Props {
  params: { id: string };
}

export default async function EditVetClinicPage({ params }: Props) {
  const clinic = await getVetClinicForAdmin(params.id);
  if (!clinic) notFound();

  const hoursRead = readOperatingHours(clinic.hours);

  const initial: VetClinicFormValues = {
    id: clinic.id,
    nameKr: clinic.nameKr,
    nameEn: clinic.nameEn ?? "",
    district: clinic.district,
    address: clinic.address,
    phone: clinic.phone,
    website: clinic.website ?? "",
    lat: clinic.location ? String(clinic.location.lat) : "",
    lng: clinic.location ? String(clinic.location.lng) : "",
    hours: hoursRead.status === "ok" ? hoursRead.value : null,
    hoursNote: clinic.hoursNote ?? "",
    englishSupport: clinic.englishSupport,
    englishSupportCondition: clinic.englishSupportCondition ?? "",
    afterHours: clinic.afterHours,
    afterHoursCondition: clinic.afterHoursCondition ?? "",
    visibility: clinic.visibility,
    adminNote: clinic.adminNote ?? "",
    collectedAt: clinic.collectedAt ? clinic.collectedAt.toISOString().slice(0, 10) : "",
  };

  return (
    <main className="mx-auto max-w-[720px] px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-xl font-bold text-content">병원 수정</h1>
      <VetClinicForm initial={initial} action={updateVetClinicAction} submitLabel="저장" />
    </main>
  );
}
