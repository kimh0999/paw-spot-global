import { Skeleton } from "@/components/ui/skeleton";

/** 목록+지도 화면. 두 영역이 함께 뜨므로 자리를 미리 잡아 레이아웃이 튀지 않게 한다. */
export default function PlacesLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8" aria-busy="true">
      <Skeleton className="h-10 w-full max-w-md" />

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="hidden h-[600px] w-full rounded-xl lg:block" />
      </div>
    </div>
  );
}
