import { Skeleton } from "@/components/ui/skeleton";

/**
 * 관리자 라우트 공통 대기 화면.
 *
 * 목록·등록·수정 세 화면이 모두 `제목 + 액션` 헤더 아래 하나의 큰 블록을 쓰므로 그 모양만
 * 잡아 준다. 공개 라우트와 마찬가지로 문구는 넣지 않는다.
 *
 * 이 파일은 `admin` 세그먼트에 있어 `AdminLayout`의 권한 확인이 끝나기 전부터 뜬다.
 * 권한이 없으면 그 확인이 리다이렉트로 끝나므로 이 화면은 잠깐 스쳐 지나간다.
 */
export default function AdminLoading() {
  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-8" aria-busy="true">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-32 rounded-md" />
      </div>

      <Skeleton className="h-[480px] w-full rounded-xl" />
    </main>
  );
}
