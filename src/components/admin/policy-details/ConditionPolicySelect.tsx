import { cn } from "@/lib/utils";

type Props = {
  name: string;
  label: string;
  options: readonly string[];
  optionLabels: Record<string, string>;
  defaultValue: string;
  /**
   * 상세 조건에서 계산된 값. 있으면 select를 잠그고 이 값을 저장한다.
   * 판단은 `derivedColumns()` 하나로만 하며 화면이 규칙을 다시 구현하지 않는다.
   */
  derivedValue?: string;
  error?: string;
  onChange: () => void;
};

/**
 * 조건 컬럼 select. 상세 조건이 이 항목을 계산해 주면 읽기 전용으로 바뀐다.
 *
 * 잠긴 select는 제출되지 않으므로 계산된 값을 hidden으로 함께 보낸다.
 * 서버도 같은 함수로 다시 계산하므로 두 값은 어긋나지 않는다.
 */
export function ConditionPolicySelect({
  name,
  label,
  options,
  optionLabels,
  defaultValue,
  derivedValue,
  error,
  onChange,
}: Props) {
  const locked = derivedValue != null;
  const errorId = `${name}-error`;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-sm font-medium">
        {label} *
      </label>
      {/* 잠금 상태가 바뀌면 remount해 계산된 값이 select에 반영되게 한다. */}
      <select
        key={derivedValue ?? "manual"}
        id={name}
        name={locked ? undefined : name}
        disabled={locked}
        defaultValue={derivedValue ?? defaultValue}
        className={cn(
          "rounded border px-3 py-2",
          locked && "bg-muted text-muted-foreground",
          error && "border-destructive",
        )}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        onChange={onChange}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {optionLabels[option] ?? option}
          </option>
        ))}
      </select>
      {locked && (
        <>
          <input type="hidden" name={name} value={derivedValue} />
          <p className="text-xs text-muted-foreground">
            상세 조건에서 자동 계산됨 — 아래 준비물 그룹을 고치면 이 값도 바뀝니다.
          </p>
        </>
      )}
      {error && (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
