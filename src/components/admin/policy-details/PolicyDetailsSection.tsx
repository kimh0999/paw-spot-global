import {
  EMPTY_POLICY_DETAILS,
  VACCINATION_COMPLETION_POLICIES,
  type PolicyDetails,
  type PolicyDetailsRead,
} from "@/lib/places/policy-details";
import { POLICY_DETAILS_SUBMITTED_FIELD } from "@/lib/places/policy-details-form";

import { AdmissionField } from "./AdmissionField";
import { BehaviorRestrictionsField } from "./BehaviorRestrictionsField";
import { HandlingGroupsField } from "./HandlingGroupsField";
import { HygieneField } from "./HygieneField";
import { PreparationGroupsField } from "./PreparationGroupsField";
import { SpaceExceptionsField } from "./SpaceExceptionsField";
import { UncertaintiesField } from "./UncertaintiesField";
import { VACCINATION_COMPLETION_LABELS } from "./labels";

type Props = {
  /** 서버가 읽은 기존 값. 깨진 JSON을 조용히 빈 값으로 바꾸지 않으려고 상태를 그대로 받는다. */
  read: PolicyDetailsRead;
  value: PolicyDetails | null;
  onChange: (next: PolicyDetails | null) => void;
};

const FIELD = "condition.policyDetails";

/**
 * 컬럼으로 표현할 수 없는 복합 이용수칙 편집기.
 *
 * 8개 그룹을 모두 다룬다. 값은 그룹별 필드로만 오가며 JSON 본문을 hidden으로
 * 왕복시키지 않는다. 편집기를 열지 않았거나 편집을 취소하면 제출 신호가 없어
 * 기존 JSON이 그대로 남는다.
 */
export function PolicyDetailsSection({ read, value, onChange }: Props) {
  if (read.status === "invalid") {
    return (
      <div className="flex flex-col gap-2 rounded border border-destructive p-3">
        <p className="text-sm font-medium text-destructive">
          저장된 상세 조건의 형식이 올바르지 않아 편집기를 열 수 없습니다.
        </p>
        <p className="text-xs text-muted-foreground">
          값을 덮어쓰지 않도록 편집을 막았습니다. 다른 항목은 그대로 저장할 수 있고,
          이 값을 버리려면 아래 &ldquo;상세 조건 초기화&rdquo;를 사용하세요.
        </p>
        <ul className="list-disc pl-5 text-xs text-muted-foreground">
          {read.issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      </div>
    );
  }

  if (value === null) {
    return (
      <div className="flex flex-col gap-2 rounded border p-3">
        <p className="text-sm font-medium">상세 이용 조건</p>
        <p className="text-xs text-muted-foreground">
          &ldquo;목줄 또는 이동가방&rdquo;처럼 위의 선택 항목만으로는 옮길 수 없는 안내문을
          입력합니다. 매장 안에서의 상태, 층·구역별 예외, 행동 제한, 입장료, 위생 안내와
          확인이 필요한 내용을 함께 남길 수 있습니다.
        </p>
        <button
          type="button"
          onClick={() => onChange(EMPTY_POLICY_DETAILS)}
          className="self-start rounded border px-3 py-1.5 text-sm"
        >
          상세 조건 입력 시작
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded border p-3">
      {/* 이 신호가 있어야 서버가 "편집기 제출"로 본다. 없으면 기존 값을 그대로 둔다. */}
      <input type="hidden" name={POLICY_DETAILS_SUBMITTED_FIELD} value="true" />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">상세 이용 조건</p>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="rounded border px-2 py-1 text-sm"
        >
          편집 취소 (기존 값 유지)
        </button>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">예방접종 완료 요구</span>
        <select
          name={`${FIELD}.entry.vaccinationCompletionPolicy`}
          value={value.entry.vaccinationCompletionPolicy}
          onChange={(e) =>
            onChange({
              ...value,
              entry: {
                vaccinationCompletionPolicy: e.target
                  .value as (typeof VACCINATION_COMPLETION_POLICIES)[number],
              },
            })
          }
          className="rounded border px-3 py-2"
        >
          {VACCINATION_COMPLETION_POLICIES.map((policy) => (
            <option key={policy} value={policy}>
              {VACCINATION_COMPLETION_LABELS[policy] ?? policy}
            </option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground">
          접종을 <strong>마쳤는지</strong>를 요구하는 조건입니다. 서류·모바일 증빙을 지참해야
          하는지는 위의 &ldquo;예방접종 증빙&rdquo; 조건이며 서로 다른 값입니다 — 한쪽을 바꿔도
          다른 쪽은 따라 바뀌지 않습니다.
        </span>
      </label>

      <PreparationGroupsField
        groups={value.preparation}
        onChange={(preparation) => onChange({ ...value, preparation })}
      />

      <HandlingGroupsField
        groups={value.handling}
        onChange={(handling) => onChange({ ...value, handling })}
      />

      <SpaceExceptionsField
        items={value.spaceExceptions}
        onChange={(spaceExceptions) => onChange({ ...value, spaceExceptions })}
      />

      <BehaviorRestrictionsField
        items={value.behaviorRestrictions}
        onChange={(behaviorRestrictions) =>
          onChange({ ...value, behaviorRestrictions })
        }
      />

      <AdmissionField
        value={value.admission}
        onChange={(admission) => onChange({ ...value, admission })}
      />

      <HygieneField
        items={value.hygiene}
        onChange={(hygiene) => onChange({ ...value, hygiene })}
      />

      <UncertaintiesField
        items={value.uncertainties}
        onChange={(uncertainties) => onChange({ ...value, uncertainties })}
      />
    </div>
  );
}
