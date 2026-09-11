import { PlaceForm } from "@/components/admin/PlaceForm";

import { createPlace } from "./actions";

interface NewPlacePageProps {
  params: Promise<{ locale: string }>;
}

export default async function NewPlacePage({ params: paramsPromise }: NewPlacePageProps) {
  // Next 15부터 params/searchParams는 Promise다. 기존 참조를 그대로 두기 위해 풀어서 같은 이름에 담는다.
  const params = await paramsPromise;
  const boundAction = createPlace.bind(null, params.locale);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">장소 등록</h1>
      <PlaceForm action={boundAction} mode="create" />
    </main>
  );
}
