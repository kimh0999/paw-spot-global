import { Skeleton } from "@/components/ui/skeleton";

/** 장소 상세. 이름 → 액션 → 조건 순서 그대로 자리를 잡는다. */
export default function PlaceDetailLoading() {
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6" aria-busy="true">
      <Skeleton className="h-5 w-24 rounded-sm" />
      <Skeleton className="mt-4 h-4 w-16 rounded-sm" />
      <Skeleton className="mt-2 h-9 w-2/3 rounded-sm" />
      <Skeleton className="mt-3 h-5 w-1/2 rounded-sm" />
      <div className="mt-5 flex gap-2">
        <Skeleton className="h-11 w-28 rounded-lg" />
        <Skeleton className="h-11 w-24 rounded-lg" />
        <Skeleton className="h-11 w-11 rounded-lg" />
      </div>
      <div className="mt-8 gap-10 lg:flex">
        <div className="min-w-0 flex-1 space-y-3">
          <Skeleton className="h-7 w-40 rounded-sm" />
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-6 w-full rounded-sm" />
          ))}
        </div>
        <Skeleton className="mt-8 h-64 shrink-0 rounded-card lg:mt-0 lg:w-[320px]" />
      </div>
    </div>
  );
}
