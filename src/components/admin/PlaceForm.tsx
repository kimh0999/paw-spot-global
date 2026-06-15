"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";

import {
  CARRIER_STROLLER_POLICIES,
  INDOOR_POLICIES,
  LEASH_POLICIES,
  MAX_DOG_SIZES,
  MUZZLE_POLICIES,
  PLACE_CATEGORIES,
  PLACE_VISIBILITY,
  REQUIRED_ITEMS,
} from "@/lib/constants";

import { LocationPickerMap } from "./LocationPickerMap";

type ActionState = {
  success?: true;
  placeId?: string;
  error?: string;
};

export type PlaceFormInitialValues = {
  nameKr?: string;
  nameEn?: string;
  category?: string;
  address?: string;
  lat?: number | null;
  lng?: number | null;
  phone?: string | null;
  website?: string | null;
  instagram?: string | null;
  thumbnailUrl?: string | null;
  tourApiId?: string | null;
  visibility?: string;
  condition?: {
    indoor?: string;
    carrierStrollerPolicy?: string;
    maxDogSize?: string;
    leash?: string;
    muzzle?: string;
    breedRestrictions?: string | null;
    requiredItems?: string[];
    cautions?: string | null;
  };
  verification?: {
    method?: string;
    verifiedAt?: string;
    note?: string | null;
  };
};

type PlaceFormProps = {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  initialValues?: PlaceFormInitialValues;
  submitLabel?: string;
  successContent?: React.ReactNode;
};

const INDOOR_LABELS: Record<string, string> = {
  ALLOWED: "실내 가능",
  OUTDOOR_ONLY: "실외/테라스만 가능",
  PARTIAL_AREA: "일부 구역만 가능",
  NOT_ALLOWED: "동반 불가",
  UNKNOWN: "확인 필요",
};

const CARRIER_STROLLER_LABELS: Record<string, string> = {
  REQUIRED: "이동장/유모차 필수",
  NOT_REQUIRED: "필수 아님",
  UNKNOWN: "확인 필요",
};

const MAX_DOG_SIZE_LABELS: Record<string, string> = {
  SMALL: "소형견까지 가능",
  MEDIUM: "중형견까지 가능",
  LARGE: "대형견까지 가능",
  UNKNOWN: "확인 필요",
};

const LEASH_LABELS: Record<string, string> = {
  REQUIRED: "목줄 필수",
  NOT_REQUIRED: "필수 아님",
  PARTIAL_AREA: "일부 공간에서만 필요",
  UNKNOWN: "확인 필요",
};

const MUZZLE_LABELS: Record<string, string> = {
  REQUIRED: "입마개 필수",
  NOT_REQUIRED: "필수 아님",
  CONDITIONAL: "일부 견종/상황에 따라 필요",
  UNKNOWN: "확인 필요",
};

const REQUIRED_ITEM_LABELS: Record<string, string> = {
  POOP_BAG: "배변봉투",
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
    >
      {pending ? "저장 중..." : label}
    </button>
  );
}

export function PlaceForm({
  action,
  initialValues,
  submitLabel = "장소 등록",
  successContent,
}: PlaceFormProps) {
  const [state, formAction] = useFormState(action, {});
  const tMap = useTranslations("admin.places.locationPicker");

  const [lat, setLat] = useState<string>(String(initialValues?.lat ?? ""));
  const [lng, setLng] = useState<string>(String(initialValues?.lng ?? ""));

  const parsedLat = parseFloat(lat);
  const parsedLng = parseFloat(lng);
  const isValidPos =
    lat !== "" &&
    lng !== "" &&
    !Number.isNaN(parsedLat) &&
    !Number.isNaN(parsedLng) &&
    parsedLat >= 33 &&
    parsedLat <= 43 &&
    parsedLng >= 124 &&
    parsedLng <= 132;

  const mapLat = isValidPos ? parsedLat : null;
  const mapLng = isValidPos ? parsedLng : null;

  const showInvalidWarning =
    lat !== "" &&
    lng !== "" &&
    !Number.isNaN(parsedLat) &&
    !Number.isNaN(parsedLng) &&
    !isValidPos;

  function handleMapChange(newLat: number, newLng: number) {
    const newLatStr = String(newLat);
    const newLngStr = String(newLng);
    if (newLatStr !== lat) setLat(newLatStr);
    if (newLngStr !== lng) setLng(newLngStr);
  }

  if (state.success) {
    return (
      successContent ?? (
        <div className="rounded border border-green-500 p-4">
          <p className="font-medium text-green-700">장소가 등록되었습니다.</p>
          <p className="mt-1 text-sm text-muted-foreground">ID: {state.placeId}</p>
        </div>
      )
    );
  }

  const iv = initialValues;

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
            defaultValue={iv?.nameKr ?? ""}
            className="rounded border px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">장소명 (영어)</span>
          <input
            name="nameEn"
            maxLength={200}
            defaultValue={iv?.nameEn ?? ""}
            className="rounded border px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">카테고리 *</span>
          <select
            name="category"
            required
            defaultValue={iv?.category ?? "RESTAURANT"}
            className="rounded border px-3 py-2"
          >
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
            defaultValue={iv?.address ?? ""}
            className="rounded border px-3 py-2"
          />
        </label>

        <div className="flex flex-col gap-2">
          <div>
            <p className="text-sm font-medium">{tMap("title")}</p>
            <p className="text-xs text-muted-foreground">{tMap("description")}</p>
          </div>
          <LocationPickerMap lat={mapLat} lng={mapLng} onChange={handleMapChange} />
        </div>

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
              value={lat}
              onChange={(e) => setLat(e.target.value)}
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
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              className="rounded border px-3 py-2"
            />
          </label>
        </div>
        {showInvalidWarning && (
          <p className="text-sm text-orange-600">{tMap("invalidCoordinates")}</p>
        )}

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">노출 상태</span>
          <select
            name="visibility"
            defaultValue={iv?.visibility ?? "DRAFT"}
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
          <input
            name="phone"
            maxLength={30}
            defaultValue={iv?.phone ?? ""}
            className="rounded border px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">웹사이트</span>
          <input
            name="website"
            type="url"
            defaultValue={iv?.website ?? ""}
            className="rounded border px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">인스타그램</span>
          <input
            name="instagram"
            maxLength={100}
            defaultValue={iv?.instagram ?? ""}
            className="rounded border px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">대표 이미지 URL</span>
          <input
            name="thumbnailUrl"
            type="url"
            defaultValue={iv?.thumbnailUrl ?? ""}
            className="rounded border px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">TourAPI ID</span>
          <input
            name="tourApiId"
            defaultValue={iv?.tourApiId ?? ""}
            className="rounded border px-3 py-2"
          />
        </label>
      </section>

      {/* 반려견 동반 조건 */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">반려견 동반 조건</h2>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">실내 동반 여부 *</span>
          <select
            name="condition.indoor"
            required
            defaultValue={iv?.condition?.indoor ?? "UNKNOWN"}
            className="rounded border px-3 py-2"
          >
            {INDOOR_POLICIES.map((p) => (
              <option key={p} value={p}>
                {INDOOR_LABELS[p] ?? p}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">이동장/유모차 여부 *</span>
          <select
            name="condition.carrierStrollerPolicy"
            required
            defaultValue={iv?.condition?.carrierStrollerPolicy ?? "UNKNOWN"}
            className="rounded border px-3 py-2"
          >
            {CARRIER_STROLLER_POLICIES.map((p) => (
              <option key={p} value={p}>
                {CARRIER_STROLLER_LABELS[p] ?? p}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">반려견 최대 허용 크기 *</span>
          <select
            name="condition.maxDogSize"
            required
            defaultValue={iv?.condition?.maxDogSize ?? "UNKNOWN"}
            className="rounded border px-3 py-2"
          >
            {MAX_DOG_SIZES.map((s) => (
              <option key={s} value={s}>
                {MAX_DOG_SIZE_LABELS[s] ?? s}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">목줄 여부 *</span>
          <select
            name="condition.leash"
            required
            defaultValue={iv?.condition?.leash ?? "UNKNOWN"}
            className="rounded border px-3 py-2"
          >
            {LEASH_POLICIES.map((p) => (
              <option key={p} value={p}>
                {LEASH_LABELS[p] ?? p}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">입마개 여부 *</span>
          <select
            name="condition.muzzle"
            required
            defaultValue={iv?.condition?.muzzle ?? "UNKNOWN"}
            className="rounded border px-3 py-2"
          >
            {MUZZLE_POLICIES.map((p) => (
              <option key={p} value={p}>
                {MUZZLE_LABELS[p] ?? p}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">견종 제한</span>
          <input
            name="condition.breedRestrictions"
            maxLength={500}
            defaultValue={iv?.condition?.breedRestrictions ?? ""}
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
                defaultChecked={iv?.condition?.requiredItems?.includes(item) ?? false}
                className="h-4 w-4"
              />
              <span className="text-sm">{REQUIRED_ITEM_LABELS[item] ?? item}</span>
            </label>
          ))}
        </fieldset>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">주의사항</span>
          <textarea
            name="condition.cautions"
            maxLength={1000}
            rows={3}
            defaultValue={iv?.condition?.cautions ?? ""}
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
            defaultValue={iv?.verification?.method ?? "PHONE"}
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
            defaultValue={iv?.verification?.verifiedAt ?? ""}
            className="rounded border px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">비고</span>
          <input
            name="verification.note"
            maxLength={500}
            defaultValue={iv?.verification?.note ?? ""}
            className="rounded border px-3 py-2"
          />
        </label>
      </section>

      <SubmitButton label={submitLabel} />
    </form>
  );
}
