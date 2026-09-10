import { Link } from "@/i18n/navigation";
import { getAdminVetClinics } from "@/lib/vets/queries";

/**
 * 관리자 병원 목록. `/admin/*` 레이아웃 가드가 이미 권한을 확인한다.
 *
 * 조회 실패를 화면으로 받는다. **마이그레이션을 아직 적용하지 않은 환경**에서는 테이블이
 * 없어 조회가 던지는데, 그때 500을 내면 무엇이 문제인지 알 수 없다.
 */
export default async function AdminVetsPage() {
  let clinics: Awaited<ReturnType<typeof getAdminVetClinics>> = [];
  let loadFailed = false;
  try {
    clinics = await getAdminVetClinics();
  } catch (error) {
    console.error("[admin/vets] 목록 조회 실패", error);
    loadFailed = true;
  }

  return (
    <main className="mx-auto max-w-[900px] px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-content">동물병원</h1>
        <Link
          href="/admin/vets/new"
          className="h-11 rounded-lg bg-primary px-4 text-sm font-semibold leading-[2.75rem] text-primary-foreground"
        >
          병원 등록
        </Link>
      </div>

      {loadFailed ? (
        <p className="mt-8 text-sm text-destructive">
          병원 목록을 불러오지 못했습니다. 마이그레이션(20260910000000_vet_clinic) 적용 여부를 확인하세요.
        </p>
      ) : clinics.length === 0 ? (
        <p className="mt-8 text-sm text-content-secondary">등록된 병원이 없습니다.</p>
      ) : (
        <ul className="mt-6 divide-y divide-border rounded-card border border-border bg-surface">
          {clinics.map((clinic) => (
            <li key={clinic.id} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="font-semibold text-content">{clinic.nameKr}</p>
                <p className="text-xs text-content-secondary">
                  {clinic.district} · {clinic.address} · {clinic.phone}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-xs text-content-muted">{clinic.visibility}</span>
                <Link
                  href={`/admin/vets/${clinic.id}/edit`}
                  className="rounded-md border border-border-control px-3 py-1.5 text-sm"
                >
                  수정
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
