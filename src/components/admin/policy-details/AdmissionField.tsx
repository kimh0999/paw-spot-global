import {
  FEE_PERIODS,
  FEE_POLICIES,
  SIZE_SCOPES,
  type PolicyDetails,
} from "@/lib/places/policy-details";
import { admissionRateKey } from "@/lib/places/policy-details-form";

import { describeAdmission } from "./describe";
import { FEE_PERIOD_LABELS, FEE_POLICY_LABELS, SIZE_SCOPE_LABELS } from "./labels";

type Admission = NonNullable<PolicyDetails["admission"]>;
type Rate = Admission["rates"][number];

type Props = {
  /** null은 "입장료 정보를 아직 다루지 않음"이다. 무료와 다른 뜻이라 나눠 둔다. */
  value: PolicyDetails["admission"];
  onChange: (next: PolicyDetails["admission"]) => void;
};

const FIELD = "condition.policyDetails.admission";
const MAX_RATES = 9;
const MAX_SERVICES = 5;

const EMPTY_ADMISSION: Admission = {
  feePolicy: "UNKNOWN",
  rates: [],
  includedServices: [],
};

/** 같은 기간·크기에 금액이 둘이면 어느 쪽이 맞는지 알 수 없다. */
function duplicatedRateKeys(rates: Admission["rates"]): Set<string> {
  const seen = new Set<string>();
  const duplicated = new Set<string>();
  for (const rate of rates) {
    const key = admissionRateKey(rate);
    if (seen.has(key)) duplicated.add(key);
    seen.add(key);
  }
  return duplicated;
}

/**
 * 입장료.
 *
 * 요금 행은 "유료"일 때만 저장된다 — 무료·확인 필요인데 금액이 남아 있으면 어느 쪽이
 * 사실인지 알 수 없기 때문이다. 포함 서비스는 매장마다 달라 코드화하지 않고 짧은 글로 받는다.
 */
export function AdmissionField({ value, onChange }: Props) {
  if (value === null) {
    return (
      <fieldset className="flex flex-col gap-2 rounded border p-3">
        <legend className="px-1 text-sm font-medium">입장료</legend>
        <p className="text-xs text-muted-foreground">
          아직 입력하지 않았습니다. 무료라는 뜻이 아니라 다루지 않았다는 뜻입니다.
        </p>
        <button
          type="button"
          onClick={() => onChange(EMPTY_ADMISSION)}
          className="self-start rounded border px-3 py-1.5 text-sm"
        >
          입장료 입력 시작
        </button>
      </fieldset>
    );
  }

  const admission = value;
  const duplicated = duplicatedRateKeys(admission.rates);
  const ratesWithoutPaid = admission.rates.length > 0 && admission.feePolicy !== "PAID";

  function update(patch: Partial<Admission>) {
    onChange({ ...admission, ...patch });
  }

  function updateRate(index: number, patch: Partial<Rate>) {
    update({
      rates: admission.rates.map((rate, i) =>
        i === index ? { ...rate, ...patch } : rate,
      ),
    });
  }

  return (
    <fieldset className="flex flex-col gap-3 rounded border p-3">
      <legend className="px-1 text-sm font-medium">입장료</legend>

      {/* 이 신호가 있어야 "입력함"으로 본다. 없으면 다루지 않은 것으로 저장된다. */}
      <input type="hidden" name={`${FIELD}.present`} value="true" />

      <div className="flex flex-wrap items-end justify-between gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium">요금 여부</span>
          <select
            name={`${FIELD}.feePolicy`}
            value={admission.feePolicy}
            onChange={(e) =>
              update({ feePolicy: e.target.value as Admission["feePolicy"] })
            }
            className="rounded border px-2 py-1 text-sm"
          >
            {FEE_POLICIES.map((policy) => (
              <option key={policy} value={policy}>
                {FEE_POLICY_LABELS[policy] ?? policy}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={() => onChange(null)}
          className="rounded border px-2 py-1 text-sm"
        >
          입장료 입력 취소
        </button>
      </div>

      {ratesWithoutPaid && (
        <p className="text-xs text-destructive">
          요금이 입력돼 있는데 요금 여부가 &ldquo;유료&rdquo;가 아닙니다. 이대로는 저장할 수
          없습니다 — 유료로 바꾸거나 요금 행을 지워 주세요.
        </p>
      )}

      {admission.rates.map((rate, index) => (
        <div key={index} className="flex flex-col gap-1">
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium">기간</span>
              <select
                name={`${FIELD}.rates.${index}.period`}
                value={rate.period}
                onChange={(e) =>
                  updateRate(index, { period: e.target.value as Rate["period"] })
                }
                className="rounded border px-2 py-1 text-sm"
              >
                {FEE_PERIODS.map((period) => (
                  <option key={period} value={period}>
                    {FEE_PERIOD_LABELS[period] ?? period}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium">크기</span>
              <select
                name={`${FIELD}.rates.${index}.dogSize`}
                value={rate.dogSize}
                onChange={(e) =>
                  updateRate(index, { dogSize: e.target.value as Rate["dogSize"] })
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
              <span className="text-xs font-medium">금액 (원)</span>
              <input
                name={`${FIELD}.rates.${index}.amountKrw`}
                type="number"
                min={0}
                max={1000000}
                value={Number.isFinite(rate.amountKrw) ? rate.amountKrw : ""}
                onChange={(e) =>
                  updateRate(index, {
                    amountKrw:
                      e.target.value === ""
                        ? (undefined as unknown as number)
                        : Number(e.target.value),
                  })
                }
                className="w-32 rounded border px-2 py-1 text-sm"
              />
            </label>

            <button
              type="button"
              onClick={() =>
                update({ rates: admission.rates.filter((_, i) => i !== index) })
              }
              className="rounded border px-2 py-1 text-sm"
            >
              삭제
            </button>
          </div>

          {duplicated.has(admissionRateKey(rate)) && (
            <p className="text-xs text-destructive">
              같은 기간·크기가 두 번 입력돼 있습니다. 하나로 정리해 주세요.
            </p>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={() =>
          update({
            rates: [...admission.rates, { period: "ALL", dogSize: "ALL", amountKrw: 0 }],
          })
        }
        disabled={admission.rates.length >= MAX_RATES}
        className="self-start rounded border px-3 py-1.5 text-sm disabled:opacity-50"
      >
        요금 추가
      </button>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium">입장료에 포함된 것 (선택)</span>
        {admission.includedServices.map((service, index) => (
          <div key={index} className="flex flex-wrap items-center gap-2">
            <input
              name={`${FIELD}.includedServices`}
              value={service}
              onChange={(e) =>
                update({
                  includedServices: admission.includedServices.map((entry, i) =>
                    i === index ? e.target.value : entry,
                  ),
                })
              }
              maxLength={100}
              placeholder="예: 음료 1잔"
              className="min-w-[200px] flex-1 rounded border px-2 py-1 text-sm"
            />
            <button
              type="button"
              onClick={() =>
                update({
                  includedServices: admission.includedServices.filter(
                    (_, i) => i !== index,
                  ),
                })
              }
              className="rounded border px-2 py-1 text-sm"
            >
              삭제
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            update({ includedServices: [...admission.includedServices, ""] })
          }
          disabled={admission.includedServices.length >= MAX_SERVICES}
          className="self-start rounded border px-3 py-1.5 text-sm disabled:opacity-50"
        >
          포함 항목 추가
        </button>
        <p className="text-xs text-muted-foreground">비워 둔 칸은 저장되지 않습니다.</p>
      </div>

      <p className="text-sm text-content-secondary">{describeAdmission(admission)}</p>
    </fieldset>
  );
}
