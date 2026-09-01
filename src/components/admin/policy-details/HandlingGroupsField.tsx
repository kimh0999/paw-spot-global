import { GROUP_MODES, HANDLING_RULES, HANDLING_STATUS } from "@/lib/places/policy-details";
import type { PolicyDetails } from "@/lib/places/policy-details";

import { describeHandling, sharedStatus } from "./describe";
import {
  GROUP_MODE_LABELS,
  HANDLING_RULE_LABELS,
  HANDLING_STATUS_LABELS,
} from "./labels";

type Groups = PolicyDetails["handling"];
type Group = Groups[number];
type Rule = Group["rules"][number];
type RuleName = Rule["rule"];
type RuleStatus = Rule["status"];

type Props = {
  groups: Groups;
  onChange: (next: Groups) => void;
};

const FIELD = "condition.policyDetails.handling";
const MAX_GROUPS = 5;

/**
 * 매장 안에서 반려견이 있어야 하는 상태.
 *
 * 준비물과 다른 개념이다 — "유모차를 챙겨와라"는 준비물, "유모차에 태워둬라"는 여기다.
 * "전용 의자에 앉히거나 안고 계세요"는 둘을 체크하고 "하나만 필요"를 고른다.
 */
export function HandlingGroupsField({ groups, onChange }: Props) {
  function updateGroup(index: number, patch: Partial<Group>) {
    onChange(groups.map((group, i) => (i === index ? { ...group, ...patch } : group)));
  }

  function toggleRule(index: number, rule: RuleName, checked: boolean) {
    const group = groups[index];
    if (!checked) {
      updateGroup(index, { rules: group.rules.filter((entry) => entry.rule !== rule) });
      return;
    }
    const status = (sharedStatus(group.rules) ?? "UNKNOWN") as RuleStatus;
    updateGroup(index, { rules: [...group.rules, { rule, status }] });
  }

  return (
    <fieldset className="flex flex-col gap-3 rounded border p-3">
      <legend className="px-1 text-sm font-medium">매장 안에서</legend>

      {groups.map((group, index) => {
        const status = sharedStatus(group.rules);
        const selected = group.rules.map((rule) => rule.rule);
        const mixed = status === null && group.rules.length > 0;

        return (
          <div key={index} className="flex flex-col gap-3 rounded border p-3">
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {HANDLING_RULES.map((rule) => (
                <label key={rule} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selected.includes(rule)}
                    onChange={(e) => toggleRule(index, rule, e.target.checked)}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">{HANDLING_RULE_LABELS[rule] ?? rule}</span>
                </label>
              ))}
            </div>

            {group.rules.map((rule, ruleIndex) => (
              <input
                key={rule.rule}
                type="hidden"
                name={`${FIELD}.${index}.rules.${ruleIndex}.rule`}
                value={rule.rule}
              />
            ))}

            {group.rules.length === 0 && (
              <p className="text-xs text-destructive">
                매장 안에서의 상태를 1개 이상 선택하세요. 선택하지 않으면 저장할 수 없습니다.
              </p>
            )}

            {group.rules.length > 1 ? (
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium">체크한 것 중에서</span>
                <select
                  name={`${FIELD}.${index}.mode`}
                  value={group.mode}
                  onChange={(e) =>
                    updateGroup(index, { mode: e.target.value as Group["mode"] })
                  }
                  className="self-start rounded border px-2 py-1 text-sm"
                >
                  {GROUP_MODES.map((mode) => (
                    <option key={mode} value={mode}>
                      {GROUP_MODE_LABELS[mode] ?? mode}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <input type="hidden" name={`${FIELD}.${index}.mode`} value={group.mode} />
            )}

            {mixed ? (
              <div className="flex flex-col gap-2 rounded border p-2">
                <p className="text-xs text-warning">
                  이 조건은 항목마다 적용 수준이 다르게 저장돼 있습니다. 값이 바뀌지 않도록
                  항목별로 표시합니다.
                </p>
                {group.rules.map((rule, ruleIndex) => (
                  <label key={rule.rule} className="flex items-center gap-2">
                    <span className="min-w-[140px] text-sm">
                      {HANDLING_RULE_LABELS[rule.rule] ?? rule.rule}
                    </span>
                    <select
                      name={`${FIELD}.${index}.rules.${ruleIndex}.status`}
                      value={rule.status}
                      onChange={(e) =>
                        updateGroup(index, {
                          rules: group.rules.map((entry, i) =>
                            i === ruleIndex
                              ? { ...entry, status: e.target.value as RuleStatus }
                              : entry,
                          ),
                        })
                      }
                      className="rounded border px-2 py-1 text-sm"
                    >
                      {HANDLING_STATUS.map((option) => (
                        <option key={option} value={option}>
                          {HANDLING_STATUS_LABELS[option] ?? option}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            ) : (
              <>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium">적용 수준</span>
                  <select
                    value={status ?? "UNKNOWN"}
                    onChange={(e) =>
                      updateGroup(index, {
                        rules: group.rules.map((rule) => ({
                          ...rule,
                          status: e.target.value as RuleStatus,
                        })),
                      })
                    }
                    className="self-start rounded border px-2 py-1 text-sm"
                  >
                    {HANDLING_STATUS.map((option) => (
                      <option key={option} value={option}>
                        {HANDLING_STATUS_LABELS[option] ?? option}
                      </option>
                    ))}
                  </select>
                </label>
                {group.rules.map((rule, ruleIndex) => (
                  <input
                    key={rule.rule}
                    type="hidden"
                    name={`${FIELD}.${index}.rules.${ruleIndex}.status`}
                    value={rule.status}
                  />
                ))}
              </>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-content-secondary">{describeHandling(group)}</p>
              <button
                type="button"
                onClick={() => onChange(groups.filter((_, i) => i !== index))}
                className="rounded border px-2 py-1 text-sm"
              >
                삭제
              </button>
            </div>
          </div>
        );
      })}

      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => onChange([...groups, { mode: "UNKNOWN", rules: [] }])}
          disabled={groups.length >= MAX_GROUPS}
          className="self-start rounded border px-3 py-1.5 text-sm disabled:opacity-50"
        >
          다른 조건 추가
        </button>
        <p className="text-xs text-muted-foreground">
          적용 수준이 다르면 조건을 별도로 추가하세요. (예: 안고 있기는 필수, 자유 이동은 금지)
        </p>
      </div>
    </fieldset>
  );
}
