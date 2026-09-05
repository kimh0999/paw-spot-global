import { HYGIENE_RULES, type PolicyDetails } from "@/lib/places/policy-details";

import { HYGIENE_RULE_LABELS } from "./labels";

type Items = PolicyDetails["hygiene"];
type Rule = Items[number];

type Props = {
  items: Items;
  onChange: (next: Items) => void;
};

const FIELD = "condition.policyDetails.hygiene";

/**
 * 위생·책임 안내.
 *
 * 요구 수준을 나누지 않는다 — 안내문에 적혀 있으면 지켜야 하는 것이고, 적혀 있지 않으면
 * 체크하지 않는다. 체크하지 않은 항목은 "필요 없음"이 아니라 "안내문에 없음"이다.
 */
export function HygieneField({ items, onChange }: Props) {
  function toggle(rule: Rule, checked: boolean) {
    onChange(checked ? [...items, rule] : items.filter((entry) => entry !== rule));
  }

  return (
    <fieldset className="flex flex-col gap-2 rounded border p-3">
      <legend className="px-1 text-sm font-medium">위생·책임 안내</legend>

      {HYGIENE_RULES.map((rule) => (
        <label key={rule} className="flex items-center gap-2">
          <input
            name={FIELD}
            type="checkbox"
            value={rule}
            checked={items.includes(rule)}
            onChange={(e) => toggle(rule, e.target.checked)}
            className="h-4 w-4"
          />
          <span className="text-sm">{HYGIENE_RULE_LABELS[rule] ?? rule}</span>
        </label>
      ))}

      <p className="text-xs text-muted-foreground">
        안내문에 적혀 있는 것만 체크하세요. 체크하지 않은 항목은 &ldquo;필요 없음&rdquo;이
        아니라 &ldquo;안내문에 없음&rdquo;으로 남습니다.
      </p>
    </fieldset>
  );
}
