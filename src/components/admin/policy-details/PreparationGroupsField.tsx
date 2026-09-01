import { GROUP_MODES, PREPARATION_SCOPES, PREPARATION_STATUS } from "@/lib/places/policy-details";
import type { PolicyDetails, PreparationItem } from "@/lib/places/policy-details";

import { describePreparation, sharedStatus } from "./describe";
import {
  GROUP_MODE_LABELS,
  PREPARATION_ITEM_LABELS,
  PREPARATION_SCOPE_LABELS,
  PREPARATION_STATUS_LABELS,
  SELECTABLE_PREPARATION_ITEMS,
} from "./labels";

type Groups = PolicyDetails["preparation"];
type Group = Groups[number];
type ItemStatus = Group["items"][number]["status"];

type Props = {
  groups: Groups;
  onChange: (next: Groups) => void;
};

const FIELD = "condition.policyDetails.preparation";
const MAX_GROUPS = 5;

/** 새로 고를 수 없는 항목이라도 이미 저장돼 있으면 보여 준다(해제는 가능). */
function visibleItems(group: Group): PreparationItem[] {
  const extra = group.items
    .map((item) => item.item)
    .filter((item) => !SELECTABLE_PREPARATION_ITEMS.includes(item));
  return [...SELECTABLE_PREPARATION_ITEMS, ...extra];
}

/**
 * 방문 전에 챙겨야 하는 물건.
 *
 * 한 묶음이 곧 하나의 조건이다. "목줄 또는 이동가방"은 둘을 함께 체크하고
 * "하나만 필요"를 고른다. 요구 수준은 묶음 전체에 한 번만 지정하며,
 * 수준이 다르면 조건을 따로 추가한다.
 */
export function PreparationGroupsField({ groups, onChange }: Props) {
  function updateGroup(index: number, patch: Partial<Group>) {
    onChange(groups.map((group, i) => (i === index ? { ...group, ...patch } : group)));
  }

  function toggleItem(index: number, item: PreparationItem, checked: boolean) {
    const group = groups[index];
    if (!checked) {
      updateGroup(index, { items: group.items.filter((entry) => entry.item !== item) });
      return;
    }
    // 새 항목은 묶음의 현재 요구 수준을 따른다. 정해진 값이 없으면 추측하지 않는다.
    const status = (sharedStatus(group.items) ?? "UNKNOWN") as ItemStatus;
    updateGroup(index, { items: [...group.items, { item, status }] });
  }

  function setGroupStatus(index: number, status: ItemStatus) {
    updateGroup(index, {
      items: groups[index].items.map((item) => ({ ...item, status })),
    });
  }

  return (
    <fieldset className="flex flex-col gap-3 rounded border p-3">
      <legend className="px-1 text-sm font-medium">방문 전 챙겨야 할 것</legend>

      {groups.map((group, index) => {
        const status = sharedStatus(group.items);
        const selected = group.items.map((item) => item.item);
        const mixed = status === null && group.items.length > 0;

        return (
          <div key={index} className="flex flex-col gap-3 rounded border p-3">
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {visibleItems(group).map((item) => (
                <label key={item} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selected.includes(item)}
                    onChange={(e) => toggleItem(index, item, e.target.checked)}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">{PREPARATION_ITEM_LABELS[item] ?? item}</span>
                </label>
              ))}
            </div>

            {/* 실제로 저장되는 값. 체크박스는 화면 조작용이라 이름을 갖지 않는다. */}
            {group.items.map((item, itemIndex) => (
              <input
                key={item.item}
                type="hidden"
                name={`${FIELD}.${index}.items.${itemIndex}.item`}
                value={item.item}
              />
            ))}

            {group.items.length === 0 && (
              <p className="text-xs text-destructive">
                챙길 준비물을 1개 이상 선택하세요. 선택하지 않으면 저장할 수 없습니다.
              </p>
            )}

            {/* 항목이 하나뿐이면 관계라는 개념 자체를 보여주지 않는다. */}
            {group.items.length > 1 ? (
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
                  이 조건은 항목마다 요구 수준이 다르게 저장돼 있습니다. 값이 바뀌지 않도록
                  항목별로 표시합니다.
                </p>
                {group.items.map((item, itemIndex) => (
                  <label key={item.item} className="flex items-center gap-2">
                    <span className="min-w-[100px] text-sm">
                      {PREPARATION_ITEM_LABELS[item.item] ?? item.item}
                    </span>
                    <select
                      name={`${FIELD}.${index}.items.${itemIndex}.status`}
                      value={item.status}
                      onChange={(e) =>
                        updateGroup(index, {
                          items: group.items.map((entry, i) =>
                            i === itemIndex
                              ? { ...entry, status: e.target.value as ItemStatus }
                              : entry,
                          ),
                        })
                      }
                      className="rounded border px-2 py-1 text-sm"
                    >
                      {PREPARATION_STATUS.map((option) => (
                        <option key={option} value={option}>
                          {PREPARATION_STATUS_LABELS[option] ?? option}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            ) : (
              <>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium">요구 수준</span>
                  <select
                    value={status ?? "UNKNOWN"}
                    onChange={(e) => setGroupStatus(index, e.target.value as ItemStatus)}
                    className="self-start rounded border px-2 py-1 text-sm"
                  >
                    {PREPARATION_STATUS.map((option) => (
                      <option key={option} value={option}>
                        {PREPARATION_STATUS_LABELS[option] ?? option}
                      </option>
                    ))}
                  </select>
                </label>
                {group.items.map((item, itemIndex) => (
                  <input
                    key={item.item}
                    type="hidden"
                    name={`${FIELD}.${index}.items.${itemIndex}.status`}
                    value={item.status}
                  />
                ))}
              </>
            )}

            <details className="text-sm">
              <summary className="cursor-pointer text-xs text-muted-foreground">
                상세 설정 · 적용 범위: {PREPARATION_SCOPE_LABELS[group.scope] ?? group.scope}
              </summary>
              <label className="mt-2 flex flex-col gap-1">
                <span className="text-xs font-medium">언제 필요한가요?</span>
                <select
                  name={`${FIELD}.${index}.scope`}
                  value={group.scope}
                  onChange={(e) =>
                    updateGroup(index, { scope: e.target.value as Group["scope"] })
                  }
                  className="self-start rounded border px-2 py-1 text-sm"
                >
                  {PREPARATION_SCOPES.map((scope) => (
                    <option key={scope} value={scope}>
                      {PREPARATION_SCOPE_LABELS[scope] ?? scope}
                    </option>
                  ))}
                </select>
              </label>
            </details>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-content-secondary">
                {describePreparation(group)}
              </p>
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
            onChange([...groups, { mode: "UNKNOWN", scope: "UNKNOWN", items: [] }])
          }
          disabled={groups.length >= MAX_GROUPS}
          className="self-start rounded border px-3 py-1.5 text-sm disabled:opacity-50"
        >
          다른 조건 추가
        </button>
        <p className="text-xs text-muted-foreground">
          요구 수준이 다르면 조건을 별도로 추가하세요. (예: 목줄은 필수, 배변봉투는 권장)
        </p>
      </div>
    </fieldset>
  );
}
