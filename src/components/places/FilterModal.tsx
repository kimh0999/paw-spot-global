import type {
  PlaceFilters,
  DogSize,
  IndoorFilter,
  CarrierFilter,
  RecentFilter,
} from "@/types/place";

interface FilterModalProps {
  isOpen: boolean;
  filters: PlaceFilters;
  onClose: () => void;
  onChange: (filters: PlaceFilters) => void;
  onReset: () => void;
  onApply: () => void;
}

const INDOOR_OPTIONS: { value: IndoorFilter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "indoor", label: "실내 가능" },
  { value: "outdoor", label: "야외만 가능" },
  { value: "exclude-unknown", label: "확인 필요 제외" },
];

const CARRIER_OPTIONS: { value: CarrierFilter; label: string }[] = [
  { value: "not-required", label: "이동장 불필요" },
  { value: "required", label: "이동장 필수" },
  { value: "stroller-ok", label: "유모차 가능" },
];

const DOG_SIZE_OPTIONS: { value: DogSize; label: string }[] = [
  { value: "small", label: "소형견" },
  { value: "medium", label: "중형견" },
  { value: "large", label: "대형견" },
];

const SUPPLY_OPTIONS = [
  { value: "leash", label: "목줄 필요" },
  { value: "waste-bag", label: "배변봉투 필요" },
  { value: "muzzle", label: "입마개 필요" },
];

const RECENT_OPTIONS: { value: RecentFilter; label: string }[] = [
  { value: "30days", label: "최근 30일 확인" },
  { value: "90days", label: "최근 90일 확인" },
];

const chipBase = "px-3 py-1.5 rounded-full text-sm border transition-colors";
const chipActive = "bg-orange-500 border-orange-500 text-white";
const chipInactive = "border-gray-300 text-gray-700 hover:border-gray-400 bg-white";

export default function FilterModal({
  isOpen,
  filters,
  onClose,
  onChange,
  onReset,
  onApply,
}: FilterModalProps) {
  const toggleDogSize = (size: DogSize) => {
    const next = filters.dogSizes.includes(size)
      ? filters.dogSizes.filter((s) => s !== size)
      : [...filters.dogSizes, size];
    onChange({ ...filters, dogSizes: next });
  };

  const toggleCarrier = (value: CarrierFilter) => {
    onChange({ ...filters, carrier: filters.carrier === value ? "all" : value });
  };

  const toggleRecent = (value: RecentFilter) => {
    onChange({ ...filters, recent: filters.recent === value ? "all" : value });
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      )}

      <div
        className={`fixed top-0 right-0 h-full w-full max-w-sm bg-white z-50 shadow-2xl flex flex-col transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="font-bold text-gray-900 text-base">플레이스 필터</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="text-gray-400 hover:text-gray-600 text-xl leading-none transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-7">
          <section>
            <p className="text-sm font-semibold text-gray-900 mb-2.5">반려견 동반 조건</p>
            <div className="flex flex-wrap gap-2">
              {INDOOR_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onChange({ ...filters, indoor: value })}
                  className={`${chipBase} ${filters.indoor === value ? chipActive : chipInactive}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          <section>
            <p className="text-sm font-semibold text-gray-900 mb-2.5">이동장 / 유모차</p>
            <div className="flex flex-wrap gap-2">
              {CARRIER_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleCarrier(value)}
                  className={`${chipBase} ${filters.carrier === value ? chipActive : chipInactive}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          <section>
            <p className="text-sm font-semibold text-gray-900 mb-2.5">강아지 크기</p>
            <div className="flex flex-wrap gap-2">
              {DOG_SIZE_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleDogSize(value)}
                  className={`${chipBase} ${filters.dogSizes.includes(value) ? chipActive : chipInactive}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          <section>
            <p className="text-sm font-semibold text-gray-900 mb-2.5">준비물</p>
            <div className="flex flex-wrap gap-2">
              {SUPPLY_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  className={`${chipBase} ${chipInactive}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">준비물 필터는 추후 지원 예정입니다.</p>
          </section>

          <section>
            <p className="text-sm font-semibold text-gray-900 mb-2.5">정보 신뢰도</p>
            <div className="flex flex-wrap gap-2">
              {RECENT_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleRecent(value)}
                  className={`${chipBase} ${filters.recent === value ? chipActive : chipInactive}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="border-t border-gray-200 px-5 py-4 flex gap-3">
          <button
            type="button"
            onClick={onReset}
            className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            초기화
          </button>
          <button
            type="button"
            onClick={onApply}
            className="flex-1 py-2.5 bg-orange-500 rounded-xl text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
          >
            결과 보기
          </button>
        </div>
      </div>
    </>
  );
}
