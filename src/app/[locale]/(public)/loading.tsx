import { Skeleton } from "@/components/ui/skeleton";

/**
 * 공개 라우트 공통 대기 화면.
 *
 * 문구를 넣지 않는다 — 짧게 지나가는 화면에 번역문이 깜빡이면 오히려 눈에 걸린다.
 * 목록·상세처럼 기다림이 길고 모양이 다른 화면은 각자 loading.tsx를 둔다.
 */
export default function PublicLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8" aria-busy="true">
      <Skeleton className="h-8 w-48" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-40 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
