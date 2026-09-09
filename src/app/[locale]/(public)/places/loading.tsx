import { Skeleton } from "@/components/ui/skeleton";

/**
 * 목록 + 지도 화면.
 * 완성된 화면과 같은 2분할 자리를 잡아 두어 로딩이 끝날 때 배치가 튀지 않게 한다.
 */
export default function PlacesLoading() {
  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden" aria-busy="true">
      <div className="h-16 shrink-0 border-b border-border" />
      <div className="flex min-h-0 flex-1">
        <div className="hidden w-[400px] shrink-0 flex-col border-r border-border p-4 lg:flex xl:w-[440px]">
          <Skeleton className="h-11 w-full rounded-lg" />
          <div className="mt-2 flex gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-11 w-16 rounded-lg" />
            ))}
          </div>
          <div className="mt-4 space-y-5">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-12 w-12 shrink-0 rounded-panel" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-2/3 rounded-sm" />
                  <Skeleton className="h-4 w-full rounded-sm" />
                  <Skeleton className="h-4 w-3/4 rounded-sm" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <Skeleton className="min-h-0 flex-1 rounded-none" />
      </div>
    </div>
  );
}
