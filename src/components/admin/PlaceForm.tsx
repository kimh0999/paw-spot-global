"use client";

import { useFormState, useFormStatus } from "react-dom";

import {
  CARRIER_POLICIES,
  DOG_SIZES,
  INDOOR_POLICIES,
  PLACE_CATEGORIES,
  PLACE_VISIBILITY,
  REQUIRED_ITEMS,
} from "@/lib/constants";

type ActionState = {
  success?: true;
  placeId?: string;
  error?: string;
};

type PlaceFormProps = {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
    >
      {pending ? "저장 중..." : "장소 등록"}
    </button>
  );
}

export function PlaceForm({ action }: PlaceFormProps) {
  const [state, formAction] = useFormState(action, {});

  if (state.success) {
    return (
      <div className="rounded border border-green-500 p-4">
        <p className="font-medium text-green-700">장소가 등록되었습니다.</p>
        <p className="mt-1 text-sm text-muted-foreground">ID: {state.placeId}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-8">
      {state.error && (
        <p className="rounded border border-destructive p-3 text-sm text-destructive">
          {state.error}
        </p>
      )}

      {/* 기본 정보 */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">기본 정보</h2>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">장소명 (한국어) *</span>
          <input
            name="nameKr"
            required
            maxLength={200}
            className="rounded border px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">장소명 (영어)</span>
          <input name="nameEn" maxLength={200} className="rounded border px-3 py-2" />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">카테고리 *</span>
          <select name="category" required className="rounded border px-3 py-2">
            {PLACE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">주소 *</span>
          <input
            name="address"
            required
            maxLength={500}
            className="rounded border px-3 py-2"
          />
        </label>

        <div className="flex gap-4">
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-sm font-medium">위도 (lat) *</span>
            <input
              name="lat"
              type="number"
              step="any"
              min={33}
              max={43}
              required
              className="rounded border px-3 py-2"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-sm font-medium">경도 (lng) *</span>
            <input
              name="lng"
              type="number"
              step="any"
              min={124}
              max={132}
              required
              className="rounded border px-3 py-2"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">노출 상태</span>
          <select
            name="visibility"
            defaultValue="DRAFT"
            className="rounded border px-3 py-2"
          >
            {PLACE_VISIBILITY.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
      </section>

      {/* 연락처 / 링크 */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">연락처 / 링크</h2>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">전화번호</span>
          <input name="phone" maxLength={30} className="rounded border px-3 py-2" />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">웹사이트</span>
          <input name="website" type="url" className="rounded border px-3 py-2" />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">인스타그램</span>
          <input name="instagram" maxLength={100} className="rounded border px-3 py-2" />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">대표 이미지 URL</span>
          <input name="thumbnailUrl" type="url" className="rounded border px-3 py-2" />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">TourAPI ID</span>
          <input name="tourApiId" className="rounded border px-3 py-2" />
        </label>
      </section>

      {/* 반려견 동반 조건 */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">반려견 동반 조건</h2>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">실내 동반 정책 *</span>
          <select
            name="condition.indoor"
            required
            className="rounded border px-3 py-2"
          >
            {INDOOR_POLICIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">이동장 정책 *</span>
          <select
            name="condition.carrier"
            required
            className="rounded border px-3 py-2"
          >
            {CARRIER_POLICIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2">
          <input
            name="condition.strollerAllowed"
            type="checkbox"
            className="h-4 w-4"
          />
          <span className="text-sm font-medium">유모차 가능</span>
        </label>

        <fieldset className="flex flex-col gap-2 rounded border p-3">
          <legend className="px-1 text-sm font-medium">허용 사이즈 * (1개 이상)</legend>
          {DOG_SIZES.map((s) => (
            <label key={s} className="flex items-center gap-2">
              <input
                name="condition.allowedSizes"
                type="checkbox"
                value={s}
                className="h-4 w-4"
              />
              <span className="text-sm">{s}</span>
            </label>
          ))}
        </fieldset>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">견종 제한</span>
          <input
            name="condition.breedRestrictions"
            maxLength={500}
            className="rounded border px-3 py-2"
          />
        </label>

        <fieldset className="flex flex-col gap-2 rounded border p-3">
          <legend className="px-1 text-sm font-medium">필요 준비물</legend>
          {REQUIRED_ITEMS.map((item) => (
            <label key={item} className="flex items-center gap-2">
              <input
                name="condition.requiredItems"
                type="checkbox"
                value={item}
                className="h-4 w-4"
              />
              <span className="text-sm">{item}</span>
            </label>
          ))}
        </fieldset>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">주의사항</span>
          <textarea
            name="condition.cautions"
            maxLength={1000}
            rows={3}
            className="rounded border px-3 py-2"
          />
        </label>
      </section>

      {/* 검증 정보 */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">검증 정보</h2>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">확인 방법 *</span>
          <select
            name="verification.method"
            required
            className="rounded border px-3 py-2"
          >
            {(["PHONE", "DM", "WEBSITE", "ON_SITE"] as const).map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">확인일 *</span>
          <input
            name="verification.verifiedAt"
            type="date"
            required
            className="rounded border px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">비고</span>
          <input
            name="verification.note"
            maxLength={500}
            className="rounded border px-3 py-2"
          />
        </label>
      </section>

      <SubmitButton />
    </form>
  );
}
