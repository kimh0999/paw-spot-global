"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import type { $ZodIssue } from "zod/v4/core";

import {
  CARRIER_STROLLER_POLICIES,
  INDOOR_POLICIES,
  LEASH_POLICIES,
  MAX_DOG_SIZES,
  MUZZLE_POLICIES,
  PLACE_CATEGORIES,
  PLACE_VISIBILITY,
  REQUIRED_ITEMS,
  VACCINATION_CERTIFICATE_POLICIES,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import { parsePlaceFormData } from "@/lib/places/form-data";
import { placeInputSchema, placeUpdateSchema } from "@/lib/validation/place";

import { LocationPickerMap } from "./LocationPickerMap";

type ActionState = {
  success?: true;
  placeId?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
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
    vaccinationCertificatePolicy?: string;
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
  mode: "create" | "edit";
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

const VACCINATION_LABELS: Record<string, string> = {
  REQUIRED: "필수",
  NOT_REQUIRED: "불필요",
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

// Converts zod issue path to form field name (matching name attributes)
function zodPathToField(path: PropertyKey[]): string {
  const joined = path
    .filter((p): p is string | number => typeof p !== "symbol")
    .join(".");
  if (joined === "location.lat") return "lat";
  if (joined === "location.lng") return "lng";
  return joined;
}

type FieldErrors = Record<string, string>;

export function PlaceForm({
  action,
  mode,
  initialValues,
  submitLabel = "장소 등록",
  successContent,
}: PlaceFormProps) {
  const [state, formAction] = useFormState(action, {});
  const tMap = useTranslations("admin.places.locationPicker");
  const t = useTranslations("admin.places.form");
  const tV = useTranslations("admin.places.form.validation");

  const [lat, setLat] = useState<string>(String(initialValues?.lat ?? ""));
  const [lng, setLng] = useState<string>(String(initialValues?.lng ?? ""));
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // Merge server-side field errors (state.fieldErrors) with client-side errors.
  // Client-side errors take precedence for fields the user has corrected.
  const allFieldErrors: FieldErrors = { ...(state.fieldErrors ?? {}), ...fieldErrors };

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

  function clearError(field: string) {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function getErrorMessage(issue: $ZodIssue): string {
    const pathStr = issue.path
      .filter((p): p is string | number => typeof p !== "symbol")
      .join(".");

    if (issue.code === "custom") {
      if (issue.message === "invalidInstagram") return tV("invalidInstagram");
      if (issue.message === "futureVerifiedAt") return tV("futureVerifiedAt");
      if (issue.message === "invalidPhone") return tV("invalidPhone");
      if (issue.message === "verificationIncomplete") return tV("verificationIncomplete");
    }

    if (pathStr === "location.lat") return tV("invalidLatitude");
    if (pathStr === "location.lng") return tV("invalidLongitude");

    if (issue.code === "invalid_format" && "format" in issue && issue.format === "url") {
      return tV("invalidUrl");
    }

    return tV("required");
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const formData = new FormData(e.currentTarget);
    const raw = parsePlaceFormData(formData);
    const result =
      mode === "create" ? placeInputSchema.safeParse(raw) : placeUpdateSchema.safeParse(raw);

    if (!result.success) {
      e.preventDefault();
      const errors: FieldErrors = {};
      for (const issue of result.error.issues as $ZodIssue[]) {
        const field = zodPathToField(issue.path);
        if (!errors[field]) {
          errors[field] = getErrorMessage(issue);
        }
      }
      setFieldErrors(errors);
    } else {
      setFieldErrors({});
    }
  }

  // Label maps built from i18n — value attrs remain raw enum strings
  const CATEGORY_LABELS: Record<string, string> = {
    CAFE: t("category.CAFE"),
    RESTAURANT: t("category.RESTAURANT"),
    TRAVEL: t("category.TRAVEL"),
    ETC: t("category.ETC"),
  };

  const VERIFICATION_METHOD_LABELS: Record<string, string> = {
    PHONE: t("verificationMethod.PHONE"),
    DM: t("verificationMethod.DM"),
    WEBSITE: t("verificationMethod.WEBSITE"),
    ON_SITE: t("verificationMethod.ON_SITE"),
  };

  const VISIBILITY_LABELS: Record<string, string> = {
    VISIBLE: t("visibility.VISIBLE"),
    DRAFT: t("visibility.DRAFT"),
    HIDDEN: t("visibility.HIDDEN"),
  };

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
  const hasFieldErrors = Object.keys(allFieldErrors).length > 0;

  return (
    <form action={formAction} onSubmit={handleSubmit} className="flex flex-col gap-8" noValidate>
      {/* 서버 에러 */}
      {state.error && (
        <p
          role="alert"
          className="rounded border border-destructive p-3 text-sm text-destructive"
        >
          {state.error}
        </p>
      )}

      {/* 클라이언트 / 서버 필드 에러 요약 */}
      {hasFieldErrors && (
        <p
          role="alert"
          aria-live="polite"
          className="rounded border border-destructive p-3 text-sm text-destructive"
        >
          {tV("fixFieldErrors")}
        </p>
      )}

      {/* 기본 정보 */}
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold">{t("basicInfo.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("basicInfo.description")}</p>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="nameKr" className="text-sm font-medium">
            장소명 (한국어) *
          </label>
          <input
            id="nameKr"
            name="nameKr"
            maxLength={200}
            defaultValue={iv?.nameKr ?? ""}
            className={cn(
              "rounded border px-3 py-2",
              allFieldErrors["nameKr"] && "border-destructive",
            )}
            aria-invalid={!!allFieldErrors["nameKr"]}
            aria-describedby={allFieldErrors["nameKr"] ? "nameKr-error" : undefined}
            onChange={() => clearError("nameKr")}
          />
          {allFieldErrors["nameKr"] && (
            <p id="nameKr-error" className="text-sm text-destructive">
              {allFieldErrors["nameKr"]}
            </p>
          )}
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">장소명 (영어)</span>
          <input
            name="nameEn"
            maxLength={200}
            defaultValue={iv?.nameEn ?? ""}
            className="rounded border px-3 py-2"
          />
        </label>

        <div className="flex flex-col gap-1">
          <label htmlFor="category" className="text-sm font-medium">
            카테고리 *
          </label>
          <select
            id="category"
            name="category"
            defaultValue={iv?.category ?? "RESTAURANT"}
            className={cn(
              "rounded border px-3 py-2",
              allFieldErrors["category"] && "border-destructive",
            )}
            aria-invalid={!!allFieldErrors["category"]}
            aria-describedby={allFieldErrors["category"] ? "category-error" : undefined}
            onChange={() => clearError("category")}
          >
            {PLACE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c] ?? c}
              </option>
            ))}
          </select>
          {allFieldErrors["category"] && (
            <p id="category-error" className="text-sm text-destructive">
              {allFieldErrors["category"]}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="address" className="text-sm font-medium">
            주소 *
          </label>
          <input
            id="address"
            name="address"
            maxLength={500}
            defaultValue={iv?.address ?? ""}
            className={cn(
              "rounded border px-3 py-2",
              allFieldErrors["address"] && "border-destructive",
            )}
            aria-invalid={!!allFieldErrors["address"]}
            aria-describedby={allFieldErrors["address"] ? "address-error" : undefined}
            onChange={() => clearError("address")}
          />
          {allFieldErrors["address"] && (
            <p id="address-error" className="text-sm text-destructive">
              {allFieldErrors["address"]}
            </p>
          )}
        </div>

        {/* 지도 위치 선택 */}
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">{tMap("title")}</p>
          <LocationPickerMap lat={mapLat} lng={mapLng} onChange={handleMapChange} />
        </div>

        <div className="flex gap-4">
          <div className="flex flex-1 flex-col gap-1">
            <label htmlFor="lat" className="text-sm font-medium">
              위도 (lat) *
            </label>
            <input
              id="lat"
              name="lat"
              type="number"
              step="any"
              min={33}
              max={43}
              value={lat}
              onChange={(e) => {
                setLat(e.target.value);
                clearError("lat");
              }}
              className={cn(
                "rounded border px-3 py-2",
                allFieldErrors["lat"] && "border-destructive",
              )}
              aria-invalid={!!allFieldErrors["lat"]}
              aria-describedby={allFieldErrors["lat"] ? "lat-error" : undefined}
            />
            {allFieldErrors["lat"] && (
              <p id="lat-error" className="text-sm text-destructive">
                {allFieldErrors["lat"]}
              </p>
            )}
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <label htmlFor="lng" className="text-sm font-medium">
              경도 (lng) *
            </label>
            <input
              id="lng"
              name="lng"
              type="number"
              step="any"
              min={124}
              max={132}
              value={lng}
              onChange={(e) => {
                setLng(e.target.value);
                clearError("lng");
              }}
              className={cn(
                "rounded border px-3 py-2",
                allFieldErrors["lng"] && "border-destructive",
              )}
              aria-invalid={!!allFieldErrors["lng"]}
              aria-describedby={allFieldErrors["lng"] ? "lng-error" : undefined}
            />
            {allFieldErrors["lng"] && (
              <p id="lng-error" className="text-sm text-destructive">
                {allFieldErrors["lng"]}
              </p>
            )}
          </div>
        </div>
        {showInvalidWarning && !allFieldErrors["lat"] && !allFieldErrors["lng"] && (
          <p className="text-sm text-orange-600">{tMap("invalidCoordinates")}</p>
        )}

        <div className="flex flex-col gap-1">
          <label htmlFor="visibility" className="text-sm font-medium">
            노출 상태
          </label>
          <select
            id="visibility"
            name="visibility"
            defaultValue={iv?.visibility ?? "DRAFT"}
            className={cn(
              "rounded border px-3 py-2",
              allFieldErrors["visibility"] && "border-destructive",
            )}
            aria-invalid={!!allFieldErrors["visibility"]}
            aria-describedby={allFieldErrors["visibility"] ? "visibility-error" : undefined}
            onChange={() => clearError("visibility")}
          >
            {PLACE_VISIBILITY.map((v) => (
              <option key={v} value={v}>
                {VISIBILITY_LABELS[v] ?? v}
              </option>
            ))}
          </select>
          {allFieldErrors["visibility"] && (
            <p id="visibility-error" className="text-sm text-destructive">
              {allFieldErrors["visibility"]}
            </p>
          )}
        </div>
      </section>

      {/* 연락처 / 링크 */}
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold">{t("contact.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("contact.description")}</p>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="phone" className="text-sm font-medium">
            전화번호
          </label>
          <input
            id="phone"
            name="phone"
            maxLength={30}
            defaultValue={iv?.phone ?? ""}
            className={cn(
              "rounded border px-3 py-2",
              allFieldErrors["phone"] && "border-destructive",
            )}
            aria-invalid={!!allFieldErrors["phone"]}
            aria-describedby={allFieldErrors["phone"] ? "phone-error" : undefined}
            onChange={() => clearError("phone")}
          />
          {allFieldErrors["phone"] && (
            <p id="phone-error" className="text-sm text-destructive">
              {allFieldErrors["phone"]}
            </p>
          )}
          <p className="text-xs text-muted-foreground">{t("phoneHelp")}</p>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="website" className="text-sm font-medium">
            웹사이트
          </label>
          <input
            id="website"
            name="website"
            type="url"
            defaultValue={iv?.website ?? ""}
            className={cn(
              "rounded border px-3 py-2",
              allFieldErrors["website"] && "border-destructive",
            )}
            aria-invalid={!!allFieldErrors["website"]}
            aria-describedby={allFieldErrors["website"] ? "website-error" : undefined}
            onChange={() => clearError("website")}
          />
          {allFieldErrors["website"] && (
            <p id="website-error" className="text-sm text-destructive">
              {allFieldErrors["website"]}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="instagram" className="text-sm font-medium">
            인스타그램
          </label>
          <input
            id="instagram"
            name="instagram"
            maxLength={100}
            defaultValue={iv?.instagram ?? ""}
            className={cn(
              "rounded border px-3 py-2",
              allFieldErrors["instagram"] && "border-destructive",
            )}
            aria-invalid={!!allFieldErrors["instagram"]}
            aria-describedby={allFieldErrors["instagram"] ? "instagram-error" : undefined}
            onChange={() => clearError("instagram")}
          />
          {allFieldErrors["instagram"] && (
            <p id="instagram-error" className="text-sm text-destructive">
              {allFieldErrors["instagram"]}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="thumbnailUrl" className="text-sm font-medium">
            대표 이미지 URL
          </label>
          <input
            id="thumbnailUrl"
            name="thumbnailUrl"
            type="url"
            defaultValue={iv?.thumbnailUrl ?? ""}
            className={cn(
              "rounded border px-3 py-2",
              allFieldErrors["thumbnailUrl"] && "border-destructive",
            )}
            aria-invalid={!!allFieldErrors["thumbnailUrl"]}
            aria-describedby={allFieldErrors["thumbnailUrl"] ? "thumbnailUrl-error" : undefined}
            onChange={() => clearError("thumbnailUrl")}
          />
          {allFieldErrors["thumbnailUrl"] && (
            <p id="thumbnailUrl-error" className="text-sm text-destructive">
              {allFieldErrors["thumbnailUrl"]}
            </p>
          )}
        </div>
      </section>

      {/* 반려견 동반 조건 */}
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold">{t("condition.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("condition.description")}</p>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="condition.indoor" className="text-sm font-medium">
            실내 동반 여부 *
          </label>
          <select
            id="condition.indoor"
            name="condition.indoor"
            defaultValue={iv?.condition?.indoor ?? "UNKNOWN"}
            className={cn(
              "rounded border px-3 py-2",
              allFieldErrors["condition.indoor"] && "border-destructive",
            )}
            aria-invalid={!!allFieldErrors["condition.indoor"]}
            aria-describedby={
              allFieldErrors["condition.indoor"] ? "condition.indoor-error" : undefined
            }
            onChange={() => clearError("condition.indoor")}
          >
            {INDOOR_POLICIES.map((p) => (
              <option key={p} value={p}>
                {INDOOR_LABELS[p] ?? p}
              </option>
            ))}
          </select>
          {allFieldErrors["condition.indoor"] && (
            <p id="condition.indoor-error" className="text-sm text-destructive">
              {allFieldErrors["condition.indoor"]}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="condition.carrierStrollerPolicy" className="text-sm font-medium">
            이동장/유모차 여부 *
          </label>
          <select
            id="condition.carrierStrollerPolicy"
            name="condition.carrierStrollerPolicy"
            defaultValue={iv?.condition?.carrierStrollerPolicy ?? "UNKNOWN"}
            className={cn(
              "rounded border px-3 py-2",
              allFieldErrors["condition.carrierStrollerPolicy"] && "border-destructive",
            )}
            aria-invalid={!!allFieldErrors["condition.carrierStrollerPolicy"]}
            aria-describedby={
              allFieldErrors["condition.carrierStrollerPolicy"]
                ? "condition.carrierStrollerPolicy-error"
                : undefined
            }
            onChange={() => clearError("condition.carrierStrollerPolicy")}
          >
            {CARRIER_STROLLER_POLICIES.map((p) => (
              <option key={p} value={p}>
                {CARRIER_STROLLER_LABELS[p] ?? p}
              </option>
            ))}
          </select>
          {allFieldErrors["condition.carrierStrollerPolicy"] && (
            <p id="condition.carrierStrollerPolicy-error" className="text-sm text-destructive">
              {allFieldErrors["condition.carrierStrollerPolicy"]}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="condition.maxDogSize" className="text-sm font-medium">
            반려견 최대 허용 크기 *
          </label>
          <select
            id="condition.maxDogSize"
            name="condition.maxDogSize"
            defaultValue={iv?.condition?.maxDogSize ?? "UNKNOWN"}
            className={cn(
              "rounded border px-3 py-2",
              allFieldErrors["condition.maxDogSize"] && "border-destructive",
            )}
            aria-invalid={!!allFieldErrors["condition.maxDogSize"]}
            aria-describedby={
              allFieldErrors["condition.maxDogSize"] ? "condition.maxDogSize-error" : undefined
            }
            onChange={() => clearError("condition.maxDogSize")}
          >
            {MAX_DOG_SIZES.map((s) => (
              <option key={s} value={s}>
                {MAX_DOG_SIZE_LABELS[s] ?? s}
              </option>
            ))}
          </select>
          {allFieldErrors["condition.maxDogSize"] && (
            <p id="condition.maxDogSize-error" className="text-sm text-destructive">
              {allFieldErrors["condition.maxDogSize"]}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="condition.leash" className="text-sm font-medium">
            목줄 여부 *
          </label>
          <select
            id="condition.leash"
            name="condition.leash"
            defaultValue={iv?.condition?.leash ?? "UNKNOWN"}
            className={cn(
              "rounded border px-3 py-2",
              allFieldErrors["condition.leash"] && "border-destructive",
            )}
            aria-invalid={!!allFieldErrors["condition.leash"]}
            aria-describedby={
              allFieldErrors["condition.leash"] ? "condition.leash-error" : undefined
            }
            onChange={() => clearError("condition.leash")}
          >
            {LEASH_POLICIES.map((p) => (
              <option key={p} value={p}>
                {LEASH_LABELS[p] ?? p}
              </option>
            ))}
          </select>
          {allFieldErrors["condition.leash"] && (
            <p id="condition.leash-error" className="text-sm text-destructive">
              {allFieldErrors["condition.leash"]}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="condition.muzzle" className="text-sm font-medium">
            입마개 여부 *
          </label>
          <select
            id="condition.muzzle"
            name="condition.muzzle"
            defaultValue={iv?.condition?.muzzle ?? "UNKNOWN"}
            className={cn(
              "rounded border px-3 py-2",
              allFieldErrors["condition.muzzle"] && "border-destructive",
            )}
            aria-invalid={!!allFieldErrors["condition.muzzle"]}
            aria-describedby={
              allFieldErrors["condition.muzzle"] ? "condition.muzzle-error" : undefined
            }
            onChange={() => clearError("condition.muzzle")}
          >
            {MUZZLE_POLICIES.map((p) => (
              <option key={p} value={p}>
                {MUZZLE_LABELS[p] ?? p}
              </option>
            ))}
          </select>
          {allFieldErrors["condition.muzzle"] && (
            <p id="condition.muzzle-error" className="text-sm text-destructive">
              {allFieldErrors["condition.muzzle"]}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="condition.vaccinationCertificatePolicy" className="text-sm font-medium">
            {t("vaccinationCertificate.label")} *
          </label>
          <select
            id="condition.vaccinationCertificatePolicy"
            name="condition.vaccinationCertificatePolicy"
            defaultValue={iv?.condition?.vaccinationCertificatePolicy ?? "UNKNOWN"}
            className={cn(
              "rounded border px-3 py-2",
              allFieldErrors["condition.vaccinationCertificatePolicy"] && "border-destructive",
            )}
            aria-invalid={!!allFieldErrors["condition.vaccinationCertificatePolicy"]}
            aria-describedby={
              allFieldErrors["condition.vaccinationCertificatePolicy"]
                ? "condition.vaccinationCertificatePolicy-error"
                : undefined
            }
            onChange={() => clearError("condition.vaccinationCertificatePolicy")}
          >
            {VACCINATION_CERTIFICATE_POLICIES.map((p) => (
              <option key={p} value={p}>
                {VACCINATION_LABELS[p] ?? p}
              </option>
            ))}
          </select>
          {allFieldErrors["condition.vaccinationCertificatePolicy"] && (
            <p
              id="condition.vaccinationCertificatePolicy-error"
              className="text-sm text-destructive"
            >
              {allFieldErrors["condition.vaccinationCertificatePolicy"]}
            </p>
          )}
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">견종 제한</span>
          <input
            name="condition.breedRestrictions"
            maxLength={500}
            defaultValue={iv?.condition?.breedRestrictions ?? ""}
            className="rounded border px-3 py-2"
          />
        </label>

        <div className="flex flex-col gap-2">
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
          <p className="text-xs text-muted-foreground">{t("requiredItemsHelp")}</p>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">주의사항</span>
          <textarea
            name="condition.cautions"
            maxLength={1000}
            rows={3}
            placeholder={t("cautionsPlaceholder")}
            defaultValue={iv?.condition?.cautions ?? ""}
            className="rounded border px-3 py-2"
          />
        </label>
      </section>

      {/* 검증 정보 */}
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold">{t("verification.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("verification.description")}</p>
        </div>

        {/* Cross-field verification error (edit: one field filled without the other) */}
        {allFieldErrors["verification"] && (
          <p className="text-sm text-destructive">{allFieldErrors["verification"]}</p>
        )}

        <div className="flex flex-col gap-1">
          <label htmlFor="verification.method" className="text-sm font-medium">
            확인 방법 {mode === "create" ? "*" : ""}
          </label>
          <select
            id="verification.method"
            name="verification.method"
            defaultValue={
              mode === "edit"
                ? (iv?.verification?.method ?? "")
                : (iv?.verification?.method ?? "PHONE")
            }
            className={cn(
              "rounded border px-3 py-2",
              allFieldErrors["verification.method"] && "border-destructive",
            )}
            aria-invalid={!!allFieldErrors["verification.method"]}
            aria-describedby={
              allFieldErrors["verification.method"] ? "verification.method-error" : undefined
            }
            onChange={() => clearError("verification.method")}
          >
            {/* Edit mode: allow leaving verification unchanged by selecting empty */}
            {mode === "edit" && <option value="">—</option>}
            {(["PHONE", "DM", "WEBSITE", "ON_SITE"] as const).map((m) => (
              <option key={m} value={m}>
                {VERIFICATION_METHOD_LABELS[m] ?? m}
              </option>
            ))}
          </select>
          {allFieldErrors["verification.method"] && (
            <p id="verification.method-error" className="text-sm text-destructive">
              {allFieldErrors["verification.method"]}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="verification.verifiedAt" className="text-sm font-medium">
            확인일 {mode === "create" ? "*" : ""}
          </label>
          <input
            id="verification.verifiedAt"
            name="verification.verifiedAt"
            type="date"
            defaultValue={iv?.verification?.verifiedAt ?? ""}
            className={cn(
              "rounded border px-3 py-2",
              allFieldErrors["verification.verifiedAt"] && "border-destructive",
            )}
            aria-invalid={!!allFieldErrors["verification.verifiedAt"]}
            aria-describedby={
              allFieldErrors["verification.verifiedAt"]
                ? "verification.verifiedAt-error"
                : undefined
            }
            onChange={() => clearError("verification.verifiedAt")}
          />
          {allFieldErrors["verification.verifiedAt"] && (
            <p id="verification.verifiedAt-error" className="text-sm text-destructive">
              {allFieldErrors["verification.verifiedAt"]}
            </p>
          )}
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">비고</span>
          <input
            name="verification.note"
            maxLength={500}
            placeholder={t("verificationNotePlaceholder")}
            defaultValue={iv?.verification?.note ?? ""}
            className="rounded border px-3 py-2"
          />
        </label>
      </section>

      {/* 외부 데이터 연동 정보 */}
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold">{t("externalData.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("externalData.description")}</p>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="tourApiId" className="text-sm font-medium">
            TourAPI ID
          </label>
          <input
            id="tourApiId"
            name="tourApiId"
            defaultValue={iv?.tourApiId ?? ""}
            className="rounded border px-3 py-2"
          />
          <p className="text-xs text-muted-foreground">{t("tourApiIdHelp")}</p>
        </div>
      </section>

      <SubmitButton label={submitLabel} />
    </form>
  );
}
