import {
  BEHAVIOR_OUTCOMES,
  BEHAVIOR_TRIGGERS,
  type PolicyDetails,
} from "@/lib/places/policy-details";

import { describeBehaviorRestriction } from "./describe";
import { BEHAVIOR_OUTCOME_LABELS, BEHAVIOR_TRIGGER_LABELS } from "./labels";

type Items = PolicyDetails["behaviorRestrictions"];
type Item = Items[number];

type Props = {
  items: Items;
  onChange: (next: Items) => void;
};

const FIELD = "condition.policyDetails.behaviorRestrictions";

/** 같은 상황에 결과가 두 개면 방문자에게 무엇을 알릴지 정할 수 없다. */
function duplicatedTriggers(items: Items): Set<string> {
  const seen = new Set<string>();
  const duplicated = new Set<string>();
  for (const item of items) {
    if (seen.has(item.trigger)) duplicated.add(item.trigger);
    seen.add(item.trigger);
  }
  return duplicated;
}

/**
 * 반려견 행동에 따른 제한.
 *
 * "현장에서 제한될 수 있음"과 "입장 불가"를 합치지 않는다 — 방문자에게 전혀 다른 뜻이다.
 * 안내문이 결과를 밝히지 않으면 "확인 필요"로 남긴다.
 */
export function BehaviorRestrictionsField({ items, onChange }: Props) {
  const duplicated = duplicatedTriggers(items);
  const unusedTrigger = BEHAVIOR_TRIGGERS.find(
    (trigger) => !items.some((item) => item.trigger === trigger),
  );

  function update(index: number, patch: Partial<Item>) {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  return (
    <fieldset className="flex flex-col gap-3 rounded border p-3">
      <legend className="px-1 text-sm font-medium">행동에 따른 제한</legend>

      {items.map((item, index) => (
        <div key={index} className="flex flex-col gap-2 rounded border p-3">
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium">상황</span>
              <select
                name={`${FIELD}.${index}.trigger`}
                value={item.trigger}
                onChange={(e) =>
                  update(index, { trigger: e.target.value as Item["trigger"] })
                }
                className="rounded border px-2 py-1 text-sm"
              >
                {BEHAVIOR_TRIGGERS.map((trigger) => (
                  <option key={trigger} value={trigger}>
                    {BEHAVIOR_TRIGGER_LABELS[trigger] ?? trigger}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium">그러면</span>
              <select
                name={`${FIELD}.${index}.outcome`}
                value={item.outcome}
                onChange={(e) =>
                  update(index, { outcome: e.target.value as Item["outcome"] })
                }
                className="rounded border px-2 py-1 text-sm"
              >
                {BEHAVIOR_OUTCOMES.map((outcome) => (
                  <option key={outcome} value={outcome}>
                    {BEHAVIOR_OUTCOME_LABELS[outcome] ?? outcome}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={() => onChange(items.filter((_, i) => i !== index))}
              className="rounded border px-2 py-1 text-sm"
            >
              삭제
            </button>
          </div>

          {duplicated.has(item.trigger) && (
            <p className="text-xs text-destructive">
              같은 상황이 두 번 입력돼 있습니다. 상황마다 결과는 하나만 저장할 수 있습니다.
            </p>
          )}

          <p className="text-sm text-content-secondary">
            {describeBehaviorRestriction(item)}
          </p>
        </div>
      ))}

      <button
        type="button"
        onClick={() =>
          unusedTrigger &&
          onChange([...items, { trigger: unusedTrigger, outcome: "UNKNOWN" }])
        }
        disabled={!unusedTrigger}
        className="self-start rounded border px-3 py-1.5 text-sm disabled:opacity-50"
      >
        제한 추가
      </button>
    </fieldset>
  );
}
