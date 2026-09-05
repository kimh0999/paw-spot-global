import {
  GROUP_MODES,
  HANDLING_RULES,
  HANDLING_SCOPES,
  HANDLING_STATUS,
} from "@/lib/places/policy-details";
import type { PolicyDetails } from "@/lib/places/policy-details";

import { describeHandling, sharedStatus } from "./describe";
import {
  GROUP_MODE_LABELS,
  HANDLING_RULE_LABELS,
  HANDLING_SCOPE_LABELS,
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
        // 행동을 2개 이상 묶으면 관계(모두/하나)가 붙는데, 그 관계는 요구에만 뜻이 통한다.
        // 금지·허용·조건부를 섞으면 문장이 뒤집히므로 저장이 거부된다. 여기서 먼저 막는다.
        const allRequired =
          group.rules.length > 0 && group.rules.every((rule) => rule.status === "REQUIRED");
        const lockedToSingleRule = group.rules.length >= 1 && !allRequired;
        const lockedToRequired = group.rules.length > 1;

        return (
          <div key={index} className="flex flex-col gap-3 rounded border p-3">
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {HANDLING_RULES.map((rule) => {
                const checked = selected.includes(rule);
                const blocked = !checked && lockedToSingleRule;
                return (
                  <label
                    key={rule}
                    className={`flex items-center gap-2 ${blocked ? "opacity-50" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={blocked}
                      onChange={(e) => toggleRule(index, rule, e.target.checked)}
                      className="h-4 w-4"
                    />
                    <span className="text-sm">{HANDLING_RULE_LABELS[rule] ?? rule}</span>
                  </label>
                );
              })}
            </div>

            {lockedToSingleRule && (
              <p className="text-xs text-content-secondary">
                금지·허용·조건부 행동은 하나씩 별도의 조건으로 추가해 주세요. 행동을 여러 개
                묶으려면 적용 수준이 「반드시 그래야 함」이어야 합니다.
              </p>
            )}

            {lockedToRequired && !allRequired && (
              <p className="text-xs text-destructive">
                행동이 2개 이상인데 「반드시 그래야 함」이 아닌 항목이 있어 이대로는 저장할 수
                없습니다. 적용 수준을 바꾸거나, 행동을 나눠 조건을 따로 만들어 주세요.
              </p>
            )}

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

            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium">언제</span>
              <select
                name={`${FIELD}.${index}.scope`}
                value={group.scope}
                onChange={(e) =>
                  updateGroup(index, { scope: e.target.value as Group["scope"] })
                }
                className="self-start rounded border px-2 py-1 text-sm"
              >
                {HANDLING_SCOPES.map((scope) => (
                  <option key={scope} value={scope}>
                    {HANDLING_SCOPE_LABELS[scope] ?? scope}
                  </option>
                ))}
              </select>
            </label>

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
                        <option
                          key={option}
                          value={option}
                          disabled={
                            lockedToRequired &&
                            option !== "REQUIRED" &&
                            option !== rule.status
                          }
                        >
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
                      <option
                        key={option}
                        value={option}
                        disabled={
                          lockedToRequired &&
                          option !== "REQUIRED" &&
                          option !== (status ?? "UNKNOWN")
                        }
                      >
                        {HANDLING_STATUS_LABELS[option] ?? option}
                      </option>
                    ))}
                  </select>
                </label>
                {lockedToRequired && (
                  <p className="text-xs text-content-secondary">
                    행동을 2개 이상 묶은 조건은 「반드시 그래야 함」으로만 저장됩니다.
                  </p>
                )}
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
          onClick={() =>
            onChange([...groups, { mode: "UNKNOWN", scope: "ALWAYS", rules: [] }])
          }
          disabled={groups.length >= MAX_GROUPS}
          className="self-start rounded border px-3 py-1.5 text-sm disabled:opacity-50"
        >
          다른 조건 추가
        </button>
        <p className="text-xs text-muted-foreground">
          적용 수준이나 적용 범위가 다르면 조건을 별도로 추가하세요.
          (예: 실내에서는 안고 있기가 필수, 실외에서는 목줄 보행이 허용)
        </p>
      </div>
    </fieldset>
  );
}
