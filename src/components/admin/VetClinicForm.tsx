"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";

import { DAY_KEYS, type OperatingHours } from "@/lib/places/operating-hours";
import {
  VET_DISTRICTS,
  VET_SERVICE_STATUSES,
  VET_VERIFICATION_TARGETS,
  type VetServiceStatus,
  type VetVerificationTarget,
} from "@/lib/vets/constants";
import type { VetClinicFormState } from "@/app/[locale]/(admin)/admin/vets/form-state";
import { VET_CLINIC_FORM_INITIAL } from "@/app/[locale]/(admin)/admin/vets/form-state";

/**
 * 병원 등록·수정 폼.
 *
 * **제출하지 않은 값과 명시적 초기화를 구분한다.** 진료시간은 `unchanged`(건드리지 않음) /
 * `edit`(값 제출) / `clear`(비우기) 세 모드를 갖고, `unchanged`면 payload에서 키를 아예 뺀다.
 * 서버는 키가 없으면 DB 값을 그대로 둔다.
 *
 * **확인 기록은 이번에 실제로 확인한 항목만 남긴다.** 주소만 고쳤는데 영어 응대 확인일까지
 * 갱신되지 않도록, 항목별 체크박스를 켠 것만 기록으로 쌓는다(D-17).
 */

const METHODS = ["PHONE", "DM", "WEBSITE", "ON_SITE", "USER_REPORT"] as const;

export interface VetClinicFormValues {
  id?: string;
  nameKr: string;
  nameEn: string;
  district: string;
  address: string;
  phone: string;
  website: string;
  lat: string;
  lng: string;
  hours: OperatingHours | null;
  hoursNote: string;
  englishSupport: VetServiceStatus;
  englishSupportCondition: string;
  afterHours: VetServiceStatus;
  afterHoursCondition: string;
  visibility: "VISIBLE" | "HIDDEN" | "DRAFT";
  adminNote: string;
  collectedAt: string;
}

/**
 * 서버가 돌려주는 코드를 관리자가 읽을 문장으로 옮긴다.
 *
 * 이 폼은 next-intl을 쓰지 않고 문구를 한국어로 고정한다 — 나머지 라벨과 같은 방식이다.
 * **서버의 공개 기준은 건드리지 않는다.** 여기서 바꾸는 것은 표시 문구뿐이다.
 */
const FORM_ERROR_MESSAGES: Record<string, string> = {
  publishBlocked: "공개 기준을 채우지 못해 저장하지 않았습니다. 아래를 채운 뒤 다시 저장하세요.",
  invalidInput: "입력한 값을 확인해 주세요.",
  authRequired: "로그인이 필요합니다.",
  forbidden: "관리자 권한이 필요합니다.",
  saveFailed: "저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
};

/** 공개를 막은 항목(D-20). `findPublishBlockers`가 돌려주는 코드와 짝이다. */
const PUBLISH_BLOCKER_MESSAGES: Record<string, string> = {
  nameKr: "병원명(한국어)을 입력하세요.",
  address: "주소를 입력하세요.",
  phone: "전화번호를 입력하세요.",
  basicVerification:
    "기본 정보 확인 기록이 필요합니다 — `이번에 확인한 항목`에서 `BASIC`을 체크하세요.",
};

export const EMPTY_VET_FORM: VetClinicFormValues = {
  nameKr: "",
  nameEn: "",
  district: "seo",
  address: "",
  phone: "",
  website: "",
  lat: "",
  lng: "",
  hours: null,
  hoursNote: "",
  englishSupport: "UNKNOWN",
  englishSupportCondition: "",
  afterHours: "UNKNOWN",
  afterHoursCondition: "",
  visibility: "DRAFT",
  adminNote: "",
  collectedAt: "",
};

type HoursMode = "unchanged" | "edit" | "clear";

type VerificationDraft = {
  enabled: boolean;
  method: (typeof METHODS)[number];
  verifiedAt: string;
  sourceUrl: string;
  note: string;
};

const label = "flex flex-col gap-1 text-sm";
const input = "rounded border border-border-control px-3 py-2 text-sm";

export default function VetClinicForm({
  initial,
  action,
  submitLabel,
}: {
  initial: VetClinicFormValues;
  action: (prev: VetClinicFormState, formData: FormData) => Promise<VetClinicFormState>;
  submitLabel: string;
}) {
  const router = useRouter();
  // React 19의 useActionState. react-dom의 useFormState는 19에서 이 훅으로 이름이 바뀌었고
  // 쓰면 렌더마다 deprecation 경고가 뜬다. 기존 관리자 폼과 같은 패턴이다.
  const [state, formAction] = useActionState(action, VET_CLINIC_FORM_INITIAL);
  const [values, setValues] = useState(initial);
  const [hoursMode, setHoursMode] = useState<HoursMode>("unchanged");
  const [hoursDraft, setHoursDraft] = useState<OperatingHours>(
    initial.hours ?? Object.fromEntries(DAY_KEYS.map((day) => [day, null])) as OperatingHours,
  );
  const [verifications, setVerifications] = useState<Record<VetVerificationTarget, VerificationDraft>>(
    () =>
      Object.fromEntries(
        VET_VERIFICATION_TARGETS.map((target) => [
          target,
          {
            enabled: false,
            method: "PHONE" as const,
            verifiedAt: new Date().toISOString().slice(0, 10),
            sourceUrl: "",
            note: "",
          },
        ]),
      ) as Record<VetVerificationTarget, VerificationDraft>,
  );

  function set<K extends keyof VetClinicFormValues>(key: K, value: VetClinicFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function buildPayload() {
    const lat = Number(values.lat);
    const lng = Number(values.lng);
    const hasCoordinate = values.lat.trim() !== "" && values.lng.trim() !== "";

    const payload: Record<string, unknown> = {
      nameKr: values.nameKr,
      nameEn: values.nameEn,
      district: values.district,
      address: values.address,
      phone: values.phone,
      website: values.website,
      location:
        hasCoordinate && Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null,
      englishSupport: {
        status: values.englishSupport,
        condition: values.englishSupportCondition,
      },
      afterHours: { status: values.afterHours, condition: values.afterHoursCondition },
      visibility: values.visibility,
      adminNote: values.adminNote,
      collectedAt: values.collectedAt ? values.collectedAt : null,
      verifications: VET_VERIFICATION_TARGETS.filter(
        (target) => verifications[target].enabled,
      ).map((target) => ({
        target,
        method: verifications[target].method,
        verifiedAt: verifications[target].verifiedAt,
        sourceUrl: verifications[target].sourceUrl,
        note: verifications[target].note,
      })),
    };

    // unchanged면 키를 넣지 않는다 — 서버가 DB 값을 그대로 둔다.
    if (hoursMode === "edit") {
      payload.hours = hoursDraft;
      payload.hoursNote = values.hoursNote;
    } else if (hoursMode === "clear") {
      payload.hours = null;
      payload.hoursNote = "";
    }

    return JSON.stringify(payload);
  }

  if (state.status === "success") {
    router.push("./");
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {values.id && <input type="hidden" name="id" value={values.id} />}
      <input type="hidden" name="payload" value={buildPayload()} />

      <section className="flex flex-col gap-3 rounded border p-4">
        <h2 className="text-sm font-semibold">기본 정보</h2>
        <label className={label}>
          병원명 (한국어) *
          <input
            className={input}
            value={values.nameKr}
            onChange={(e) => set("nameKr", e.target.value)}
            required
          />
        </label>
        <label className={label}>
          공식 영문명 (있는 경우만)
          <input
            className={input}
            value={values.nameEn}
            onChange={(e) => set("nameEn", e.target.value)}
          />
          <span className="text-xs text-content-muted">
            병원이 실제로 쓰는 이름만 넣습니다. 자동 번역하지 않습니다.
          </span>
        </label>
        <label className={label}>
          구 *
          <select
            className={input}
            value={values.district}
            onChange={(e) => set("district", e.target.value)}
          >
            {VET_DISTRICTS.map((district) => (
              <option key={district} value={district}>
                {district}
              </option>
            ))}
          </select>
        </label>
        <label className={label}>
          주소 *
          <input
            className={input}
            value={values.address}
            onChange={(e) => set("address", e.target.value)}
            required
          />
        </label>
        <label className={label}>
          전화 *
          <input
            className={input}
            value={values.phone}
            onChange={(e) => set("phone", e.target.value)}
            required
          />
        </label>
        <label className={label}>
          공식 링크
          <input
            className={input}
            value={values.website}
            onChange={(e) => set("website", e.target.value)}
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className={label}>
            위도 (선택)
            <input className={input} value={values.lat} onChange={(e) => set("lat", e.target.value)} />
          </label>
          <label className={label}>
            경도 (선택)
            <input className={input} value={values.lng} onChange={(e) => set("lng", e.target.value)} />
          </label>
        </div>
        <p className="text-xs text-content-muted">
          좌표를 비우면 거리를 만들지 않습니다. 검색·연락은 그대로 됩니다.
        </p>
        <label className={label}>
          데이터 수집일 (확인일과 다릅니다)
          <input
            type="date"
            className={input}
            value={values.collectedAt}
            onChange={(e) => set("collectedAt", e.target.value)}
          />
        </label>
      </section>

      <section className="flex flex-col gap-3 rounded border p-4">
        <h2 className="text-sm font-semibold">안내된 진료시간</h2>
        <div className="flex flex-wrap gap-3 text-sm">
          {(["unchanged", "edit", "clear"] as const).map((mode) => (
            <label key={mode} className="flex items-center gap-1.5">
              <input
                type="radio"
                name="hoursMode"
                checked={hoursMode === mode}
                onChange={() => setHoursMode(mode)}
              />
              {mode === "unchanged" ? "건드리지 않음" : mode === "edit" ? "입력" : "비우기"}
            </label>
          ))}
        </div>
        {hoursMode === "edit" && (
          <div className="flex flex-col gap-2">
            {DAY_KEYS.map((day) => {
              const value = hoursDraft[day];
              return (
                <div key={day} className="flex items-center gap-2 text-sm">
                  <span className="w-10">{day}</span>
                  <input
                    type="time"
                    className={input}
                    value={value?.open ?? ""}
                    onChange={(e) =>
                      setHoursDraft((prev) => ({
                        ...prev,
                        [day]: e.target.value
                          ? { open: e.target.value, close: value?.close ?? "18:00" }
                          : null,
                      }))
                    }
                  />
                  <input
                    type="time"
                    className={input}
                    value={value?.close ?? ""}
                    onChange={(e) =>
                      setHoursDraft((prev) => ({
                        ...prev,
                        [day]: value
                          ? { open: value.open, close: e.target.value }
                          : null,
                      }))
                    }
                  />
                  <span className="text-xs text-content-muted">비우면 휴무</span>
                </div>
              );
            })}
            <label className={label}>
              보조 안내 (브레이크타임 등)
              <input
                className={input}
                value={values.hoursNote}
                onChange={(e) => set("hoursNote", e.target.value)}
              />
            </label>
          </div>
        )}
      </section>

      <ServiceSection
        title="영어 응대"
        group="englishSupport"
        status={values.englishSupport}
        condition={values.englishSupportCondition}
        onStatus={(status) => set("englishSupport", status)}
        onCondition={(condition) => set("englishSupportCondition", condition)}
      />
      <ServiceSection
        title="야간·응급 진료"
        group="afterHours"
        status={values.afterHours}
        condition={values.afterHoursCondition}
        onStatus={(status) => set("afterHours", status)}
        onCondition={(condition) => set("afterHoursCondition", condition)}
      />

      <section className="flex flex-col gap-3 rounded border p-4">
        <h2 className="text-sm font-semibold">이번에 확인한 항목</h2>
        <p className="text-xs text-content-muted">
          체크한 항목만 확인 기록으로 쌓입니다. 주소만 고쳤다면 기본 정보만 체크하세요.
          기록은 확인 당시의 값과 함께 저장되므로, 값을 고치면 이전 기록은 새 값을 검증하지 않습니다.
        </p>
        {VET_VERIFICATION_TARGETS.map((target) => {
          const draft = verifications[target];
          return (
            <div key={target} className="flex flex-col gap-2 rounded border p-3">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={draft.enabled}
                  onChange={(e) =>
                    setVerifications((prev) => ({
                      ...prev,
                      [target]: { ...prev[target], enabled: e.target.checked },
                    }))
                  }
                />
                {target}
              </label>
              {draft.enabled && (
                <div className="grid gap-2 sm:grid-cols-2">
                  <select
                    className={input}
                    value={draft.method}
                    onChange={(e) =>
                      setVerifications((prev) => ({
                        ...prev,
                        [target]: {
                          ...prev[target],
                          method: e.target.value as VerificationDraft["method"],
                        },
                      }))
                    }
                  >
                    {METHODS.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                  <input
                    type="date"
                    className={input}
                    value={draft.verifiedAt}
                    onChange={(e) =>
                      setVerifications((prev) => ({
                        ...prev,
                        [target]: { ...prev[target], verifiedAt: e.target.value },
                      }))
                    }
                  />
                  <input
                    className={input}
                    placeholder="출처 URL"
                    value={draft.sourceUrl}
                    onChange={(e) =>
                      setVerifications((prev) => ({
                        ...prev,
                        [target]: { ...prev[target], sourceUrl: e.target.value },
                      }))
                    }
                  />
                  <input
                    className={input}
                    placeholder="비고"
                    value={draft.note}
                    onChange={(e) =>
                      setVerifications((prev) => ({
                        ...prev,
                        [target]: { ...prev[target], note: e.target.value },
                      }))
                    }
                  />
                </div>
              )}
            </div>
          );
        })}
      </section>

      <section className="flex flex-col gap-3 rounded border p-4">
        <h2 className="text-sm font-semibold">공개와 내부 메모</h2>
        <label className={label}>
          노출 상태
          <select
            className={input}
            value={values.visibility}
            onChange={(e) => set("visibility", e.target.value as VetClinicFormValues["visibility"])}
          >
            <option value="DRAFT">임시저장</option>
            <option value="VISIBLE">공개</option>
            <option value="HIDDEN">숨김</option>
          </select>
          <span className="text-xs text-content-muted">
            공개하려면 병원명·주소·전화와 기본 정보 확인 기록이 필요합니다.
            영어 응대·야간 진료가 미확인이어도 공개할 수 있습니다.
          </span>
        </label>
        <label className={label}>
          관리자 메모 (사용자 화면에 나오지 않습니다)
          <textarea
            className={input}
            rows={3}
            value={values.adminNote}
            onChange={(e) => set("adminNote", e.target.value)}
          />
        </label>
      </section>

      {state.status === "error" && (
        <div
          role="alert"
          className="rounded border border-destructive p-3 text-sm text-destructive"
        >
          <p>{FORM_ERROR_MESSAGES[state.message] ?? state.message}</p>
          {state.issues && state.issues.length > 0 && (
            <ul className="mt-1 list-disc pl-5 text-xs">
              {state.issues.map((issue) => (
                <li key={issue}>
                  {/* 공개 차단은 코드 하나가 곧 항목이다. 입력값 오류(zod)는 그대로 보여준다. */}
                  {PUBLISH_BLOCKER_MESSAGES[issue] ?? issue}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <SubmitButton label={submitLabel} />
    </form>
  );
}

/** `useFormStatus`는 form의 자식에서만 읽힌다. 그래서 버튼을 따로 뺀다. */
function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-11 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground disabled:opacity-60"
    >
      {pending ? "저장 중…" : label}
    </button>
  );
}

function ServiceSection({
  title,
  group,
  status,
  condition,
  onStatus,
  onCondition,
}: {
  title: string;
  /**
   * 라디오의 `name`. 없으면 브라우저가 이 버튼들을 **한 묶음으로 보지 않는다** —
   * 화살표 키 이동이 안 되고, 보조기술은 낱개 버튼으로 읽는다.
   * 두 묶음(영어 응대·야간 진료)이 같은 라벨 네 개를 쓰므로 묶음 이름도 서로 달라야 한다.
   * 제출은 `payload` 하나로만 나가므로(actions.ts) 이 이름은 저장에 쓰이지 않는다.
   */
  group: string;
  status: VetServiceStatus;
  condition: string;
  onStatus: (status: VetServiceStatus) => void;
  onCondition: (condition: string) => void;
}) {
  return (
    <section className="flex flex-col gap-3 rounded border p-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="flex flex-wrap gap-3 text-sm" role="radiogroup" aria-label={title}>
        {VET_SERVICE_STATUSES.map((value) => (
          <label key={value} className="flex items-center gap-1.5">
            <input
              type="radio"
              name={group}
              checked={status === value}
              onChange={() => onStatus(value)}
            />
            {value}
          </label>
        ))}
      </div>
      {status === "CONDITIONAL" && (
        <label className={label}>
          조건 * (적용 시간·방법 등)
          <input className={input} value={condition} onChange={(e) => onCondition(e.target.value)} />
          <span className="text-xs text-content-muted">
            조건부는 조건 문구가 있어야 저장됩니다. 조건 없이 &ldquo;조건부&rdquo;만 두면 화면에서 가능처럼 읽힙니다.
          </span>
        </label>
      )}
    </section>
  );
}
