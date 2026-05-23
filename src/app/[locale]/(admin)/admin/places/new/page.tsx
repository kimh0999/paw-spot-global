import { PlaceForm } from "@/components/admin/PlaceForm";

import { createPlace } from "./actions";

export default function NewPlacePage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">장소 등록</h1>
      <PlaceForm action={createPlace} />
    </main>
  );
}
