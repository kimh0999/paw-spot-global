import { UNCERTAINTY_TARGETS, type PolicyDetails } from "@/lib/places/policy-details";

import { UNCERTAINTY_TARGET_LABELS } from "./labels";

type Items = PolicyDetails["uncertainties"];

type Props = {
  items: Items;
  onChange: (next: Items) => void;
};

const FIELD = "condition.policyDetails.uncertainties";
const MAX_ITEMS = 12;

/**
 * 확인되지 않은 항목. 기본은 "분야"와 "확인할 내용" 두 칸만 보여준다.
 *
 * 장소 단위 "확인 필요" 하나로는 무엇을 물어야 하는지가 남지 않는다.
 * 근거 원문과 매장에 물어볼 질문은 선택 사항이라 접어 둔다.
 */
export function UncertaintiesField({ items, onChange }: Props) {
  function update(index: number, patch: Partial<Items[number]>) {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  return (
    <fieldset className="flex flex-col gap-3 rounded border p-3">
      <legend className="px-1 text-sm font-medium">확인이 필요한 항목</legend>

      {items.map((item, index) => (
        <div key={index} className="flex flex-col gap-2 rounded border p-3">
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium">분야</span>
              <select
                name={`${FIELD}.${index}.target`}
                value={item.target}
                onChange={(e) =>
                  update(index, {
                    target: e.target.value as (typeof UNCERTAINTY_TARGETS)[number],
                  })
                }
                className="rounded border px-2 py-1 text-sm"
              >
                {UNCERTAINTY_TARGETS.map((target) => (
                  <option key={target} value={target}>
                    {UNCERTAINTY_TARGET_LABELS[target] ?? target}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex min-w-[240px] flex-1 flex-col gap-1">
              <span className="text-xs font-medium">확인할 내용</span>
              <input
                name={`${FIELD}.${index}.reason`}
                value={item.reason}
                onChange={(e) => update(index, { reason: e.target.value })}
                maxLength={300}
                placeholder="예: 목줄과 이동가방 중 하나만 챙기면 되는지 불명확"
                className="rounded border px-2 py-1 text-sm"
              />
            </label>

            <button
              type="button"
              onClick={() => onChange(items.filter((_, i) => i !== index))}
              className="rounded border px-2 py-1 text-sm"
            >
              삭제
            </button>
          </div>

          <details className="text-sm">
            <summary className="cursor-pointer text-xs text-muted-foreground">
              자세히 · 근거 원문과 매장에 물어볼 질문 (선택)
            </summary>
            <div className="mt-2 flex flex-col gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium">근거가 된 안내문 문장</span>
                <input
                  name={`${FIELD}.${index}.quote`}
                  value={item.quote ?? ""}
                  onChange={(e) => update(index, { quote: e.target.value })}
                  maxLength={500}
                  placeholder="예: 리드줄 / 이동가방 / 유모차 필수"
                  className="rounded border px-2 py-1 text-sm"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium">매장에 물어볼 질문</span>
                <input
                  name={`${FIELD}.${index}.question`}
                  value={item.question ?? ""}
                  onChange={(e) => update(index, { question: e.target.value })}
                  maxLength={300}
                  placeholder="예: 셋 중 하나만 챙기면 되나요?"
                  className="rounded border px-2 py-1 text-sm"
                />
              </label>
            </div>
          </details>
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange([...items, { target: "PREPARATION", reason: "" }])}
        disabled={items.length >= MAX_ITEMS}
        className="self-start rounded border px-3 py-1.5 text-sm disabled:opacity-50"
      >
        확인 항목 추가
      </button>
    </fieldset>
  );
}
