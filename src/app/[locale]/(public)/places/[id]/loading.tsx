import { Skeleton } from "@/components/ui/skeleton";

/** 장소 상세. 사진 → 이름 → 조건 카드 순서 그대로 자리를 잡는다. */
export default function PlaceDetailLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6" aria-busy="true">
      <Skeleton className="h-56 w-full rounded-2xl" />
      <Skeleton className="mt-6 h-8 w-2/3" />
      <Skeleton className="mt-2 h-4 w-1/2" />
      <Skeleton className="mt-6 h-64 w-full rounded-2xl" />
      <Skeleton className="mt-4 h-40 w-full rounded-2xl" />
    </div>
  );
}
