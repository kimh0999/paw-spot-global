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

      {/*
        쌓인 확인 기록을 읽기 전용으로 보여준다. 기록을 추가만 하고 볼 수 없으면
        무엇을 언제 확인했는지 모른 채 다시 확인하게 된다.
        `verifiedValue`는 그 기록이 확인한 값이라, 지금 값과 다르면 근거가 떨어져 나간 것이다.
      */}
      <section className="mb-6 rounded border p-4">
        <h2 className="text-sm font-semibold">쌓인 확인 기록</h2>
        {clinic.verifications.length === 0 ? (
          <p className="mt-2 text-xs text-content-muted">아직 확인 기록이 없습니다.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-xs text-content-secondary">
            {clinic.verifications.map((record, index) => (
              <li key={`${record.target}-${record.verifiedAt.toISOString()}-${index}`}>
                {record.target} · {record.verifiedAt.toISOString().slice(0, 10)} · {record.method} ·{" "}
                {record.verifiedBy}
                {record.verifiedValue && (
                  <span className="text-content-muted"> · 확인한 값: {record.verifiedValue}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <VetClinicForm initial={initial} action={updateVetClinicAction} submitLabel="저장" />
    </main>
  );
}
