import {
  SIZE_SCOPES,
  SPACE_ACCESS,
  SPACE_AREAS,
  type PolicyDetails,
} from "@/lib/places/policy-details";
import { spaceExceptionKey } from "@/lib/places/policy-details-form";

import { describeSpaceException } from "./describe";
import { SIZE_SCOPE_LABELS, SPACE_ACCESS_LABELS, SPACE_AREA_LABELS } from "./labels";

type Items = PolicyDetails["spaceExceptions"];
type Item = Items[number];

type Props = {
  items: Items;
  onChange: (next: Items) => void;
};

const FIELD = "condition.policyDetails.spaceExceptions";
const MAX_ITEMS = 8;

/** 같은 구역·크기가 두 번 나오면 어느 쪽이 맞는지 알 수 없다. 저장 경로도 같은 규칙으로 막는다. */
function duplicatedKeys(items: Items): Set<string> {
  const seen = new Set<string>();
  const duplicated = new Set<string>();
  for (const item of items) {
    const key = spaceExceptionKey(item);
    if (seen.has(key)) duplicated.add(key);
    seen.add(key);
  }
  return duplicated;
}

/**
 * 층·구역별로 다른 출입 규칙.
 *
 * "1층은 안 되고 2층은 된다", "테라스는 대형견만 가능"처럼 장소 전체 조건 하나로는
 * 담을 수 없는 예외를 적는다. 크기를 고르지 않으면 크기와 무관하게 적용된다.
 */
export function SpaceExceptionsField({ items, onChange }: Props) {
  const duplicated = duplicatedKeys(items);

  function update(index: number, patch: Partial<Item>) {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  // 구역을 바꾸면 그 구역에서 쓰지 않는 칸은 비운다. 남겨 두면 화면에 없는 값이 저장된다.
  function setArea(index: number, area: Item["area"]) {
    update(index, {
      area,
      floor: area === "FLOOR" ? items[index].floor : undefined,
      label: area === "OTHER" ? items[index].label : undefined,
    });
  }

  return (
    <fieldset className="flex flex-col gap-3 rounded border p-3">
      <legend className="px-1 text-sm font-medium">층·구역별 예외</legend>

      {items.map((item, index) => (
        <div key={index} className="flex flex-col gap-2 rounded border p-3">
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium">구역</span>
              <select
                name={`${FIELD}.${index}.area`}
                value={item.area}
                onChange={(e) => setArea(index, e.target.value as Item["area"])}
                className="rounded border px-2 py-1 text-sm"
              >
                {SPACE_AREAS.map((area) => (
                  <option key={area} value={area}>
                    {SPACE_AREA_LABELS[area] ?? area}
                  </option>
                ))}
              </select>
            </label>

            {item.area === "FLOOR" && (
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium">층 (지하는 -1)</span>
                <input
                  name={`${FIELD}.${index}.floor`}
                  type="number"
                  min={-5}
                  max={50}
                  value={item.floor ?? ""}
                  onChange={(e) =>
                    update(index, {
                      floor: e.target.value === "" ? undefined : Number(e.target.value),
                    })
                  }
                  className="w-24 rounded border px-2 py-1 text-sm"
                />
              </label>
            )}

            {item.area === "OTHER" && (
              <label className="flex min-w-[160px] flex-1 flex-col gap-1">
                <span className="text-xs font-medium">구역 이름</span>
                <input
                  name={`${FIELD}.${index}.label`}
                  value={item.label ?? ""}
                  onChange={(e) => update(index, { label: e.target.value })}
                  maxLength={100}
                  placeholder="예: 루프탑"
                  className="rounded border px-2 py-1 text-sm"
                />
              </label>
            )}

            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium">적용 크기</span>
              <select
                name={`${FIELD}.${index}.appliesToSize`}
                value={item.appliesToSize}
                onChange={(e) =>
                  update(index, { appliesToSize: e.target.value as Item["appliesToSize"] })
                }
                className="rounded border px-2 py-1 text-sm"
              >
                {SIZE_SCOPES.map((size) => (
                  <option key={size} value={size}>
                    {SIZE_SCOPE_LABELS[size] ?? size}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium">출입</span>
              <select
                name={`${FIELD}.${index}.access`}
                value={item.access}
                onChange={(e) => update(index, { access: e.target.value as Item["access"] })}
                className="rounded border px-2 py-1 text-sm"
              >
                {SPACE_ACCESS.map((access) => (
                  <option key={access} value={access}>
                    {SPACE_ACCESS_LABELS[access] ?? access}
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

          {duplicated.has(spaceExceptionKey(item)) && (
            <p className="text-xs text-destructive">
              같은 구역·크기가 두 번 입력돼 있습니다. 어느 쪽이 맞는지 알 수 없어 이대로는
              저장할 수 없습니다. 하나로 정리해 주세요.
            </p>
          )}

          <p className="text-sm text-content-secondary">{describeSpaceException(item)}</p>
        </div>
      ))}

      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() =>
            onChange([
              ...items,
              { area: "INDOOR", appliesToSize: "ALL", access: "UNKNOWN" },
            ])
          }
          disabled={items.length >= MAX_ITEMS}
          className="self-start rounded border px-3 py-1.5 text-sm disabled:opacity-50"
        >
          예외 추가
        </button>
        <p className="text-xs text-muted-foreground">
          장소 전체가 아니라 특정 층·구역에만 걸리는 규칙을 적습니다. (예: 2층은 출입 불가,
          테라스는 소형견만 가능)
        </p>
      </div>
    </fieldset>
  );
}
