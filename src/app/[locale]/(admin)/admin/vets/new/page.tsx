import VetClinicForm, { EMPTY_VET_FORM } from "@/components/admin/VetClinicForm";
import { createVetClinicAction } from "../actions";

export default function NewVetClinicPage() {
  return (
    <main className="mx-auto max-w-[720px] px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-xl font-bold text-content">병원 등록</h1>
      <VetClinicForm initial={EMPTY_VET_FORM} action={createVetClinicAction} submitLabel="등록" />
    </main>
  );
}
