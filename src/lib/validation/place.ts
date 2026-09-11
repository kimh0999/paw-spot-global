import { z } from "zod";

import {
  CARRIER_STROLLER_POLICIES,
  INDOOR_POLICIES,
  LEASH_POLICIES,
  MAX_DOG_SIZES,
  MUZZLE_POLICIES,
  PLACE_CATEGORIES,
  PLACE_VISIBILITY,
  REQUIRED_ITEMS,
  SUPPORTED_LOCALES,
  VACCINATION_CERTIFICATE_POLICIES,
} from "@/lib/constants";
import {
  DAY_KEYS,
  HOURS_NOTE_MAX_LENGTH,
  operatingHoursSchema,
  type OperatingHours,
} from "@/lib/places/operating-hours";
import { httpUrlSchema } from "@/lib/validation/url";

// @handle, handle, or instagram.com URL
const INSTAGRAM_REGEX =
  /^(@?[a-zA-Z0-9_.]{1,30}|https?:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9_.]+\/?)$/;

// Digits, spaces, hyphens, plus sign, parentheses
const PHONE_REGEX = /^[\d\s\-()+]+$/;

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/**
 * 요일별 입력 원문 → `OperatingHours`.
 *
 * 양쪽이 비면 그날은 **휴무**(`null`)다. 한쪽만 채우면 오류다 — 여는 시각만 있고 닫는
 * 시각이 없으면 화면에 무엇을 보여줄지 정할 수 없다.
 * 전 요일이 비어 있으면 `null`을 준다. "아직 입력하지 않음"과 "전 요일 휴무"는 다르다.
 */
const hoursFormSchema = z
  .record(z.string(), z.object({ open: z.string(), close: z.string() }))
  // 운영시간을 다루지 않는 호출부(기존 테스트 등)는 키를 보내지 않는다. 그 경우도
  // "아직 입력하지 않음"(null)으로 떨어져야 한다.
  .default({})
  .transform((input, ctx) => {
    const draft: Record<string, { open: string; close: string } | null> = {};
    let anyFilled = false;

    for (const day of DAY_KEYS) {
      const entry = input[day] ?? { open: "", close: "" };
      const open = entry.open.trim();
      const close = entry.close.trim();

      if (open === "" && close === "") {
        draft[day] = null;
        continue;
      }
      if (open === "" || close === "") {
        ctx.addIssue({
          code: "custom",
          message: "hoursIncompleteDay",
          path: [day],
        });
        return z.NEVER;
      }
      draft[day] = { open, close };
      anyFilled = true;
    }

    if (!anyFilled) return null;

    const parsed = operatingHoursSchema.safeParse(draft);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        ctx.addIssue({ code: "custom", message: "invalidHours", path: issue.path });
      }
      return z.NEVER;
    }
    return parsed.data as OperatingHours;
  });

function isNotFutureKST(date: Date): boolean {
  const nowKST = new Date(Date.now() + KST_OFFSET_MS);
  const todayKST = nowKST.toISOString().slice(0, 10);
  const verifiedKST = new Date(date.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
  return verifiedKST <= todayKST;
}

const placeBaseSchema = z.object({
  nameKr: z.string().min(1).max(200),
  nameEn: z.string().max(200).nullish(),
  category: z.enum(PLACE_CATEGORIES),
  address: z.string().min(1).max(500),
  location: z.object({
    lat: z.number().min(33).max(43),
    lng: z.number().min(124).max(132),
  }),
  phone: z
    .string()
    .max(30)
    .nullish()
    .refine((val) => !val || PHONE_REGEX.test(val), { message: "invalidPhone" }),
  website: httpUrlSchema.nullish(),
  instagram: z
    .string()
    .max(100)
    .nullish()
    .refine((val) => !val || INSTAGRAM_REGEX.test(val), { message: "invalidInstagram" }),
  thumbnailUrl: httpUrlSchema.nullish(),
  tourApiId: z.string().nullish(),
  visibility: z.enum(PLACE_VISIBILITY).default("DRAFT"),
  hours: hoursFormSchema,
  hoursNote: z.string().max(HOURS_NOTE_MAX_LENGTH).nullish(),

  condition: z.object({
    indoor: z.enum(INDOOR_POLICIES),
    carrierStrollerPolicy: z.enum(CARRIER_STROLLER_POLICIES),
    maxDogSize: z.enum(MAX_DOG_SIZES),
    leash: z.enum(LEASH_POLICIES),
    muzzle: z.enum(MUZZLE_POLICIES),
    vaccinationCertificatePolicy: z.enum(VACCINATION_CERTIFICATE_POLICIES).default("UNKNOWN"),
    breedRestrictions: z.string().max(500).nullish(),
    requiredItems: z.array(z.enum(REQUIRED_ITEMS)),
    cautions: z.string().max(1000).nullish(),
    // 구조화 상세 조건 본문은 이 스키마로 들어오지 않는다. 폼은 편집 대상 필드만
    // 보내고 서버가 DB의 최신 값과 병합한 뒤 policyDetailsSchema로 다시 검증한다
    // (src/lib/places/policy-details-form.ts).
    // 잘못 들어간 구조화 상세 조건을 미구조화 상태로 되돌리는 신호.
    // 실내·크기·목줄 같은 핵심 조건 컬럼은 건드리지 않는다.
    clearPolicyDetails: z.boolean().default(false),
  }),
});

// 확인 당시의 안내문 원문 스냅샷(D-03). 표시용 문구가 아니라 근거 자료라
// 오타도 그대로 둔다. 한·영 병기 안내문은 쪼개지 않고 통째로 보존한다.
const policySnapshotShape = {
  rawPolicyText: z.string().max(5000).optional(),
  sourceLanguages: z.array(z.enum(SUPPORTED_LOCALES)).default([]),
  sourceUrl: httpUrlSchema.nullish(),
};

const verificationSchema = z.object({
  method: z.enum(["PHONE", "DM", "WEBSITE", "ON_SITE"]),
  verifiedAt: z.coerce.date().refine(isNotFutureKST, { message: "futureVerifiedAt" }),
  note: z.string().max(500).optional(),
  ...policySnapshotShape,
});

export const placeInputSchema = placeBaseSchema.extend({
  verification: verificationSchema,
});

export type PlaceInput = z.infer<typeof placeInputSchema>;

// For update: verification fields arrive as raw strings from the form.
// superRefine validates cross-field consistency; transform converts to typed output.
export const placeUpdateSchema = placeBaseSchema
  .extend({
    verification: z.object({
      method: z.string(),
      verifiedAt: z.string(),
      note: z.string().optional(),
      ...policySnapshotShape,
    }),
  })
  .superRefine((data, ctx) => {
    const { method, verifiedAt, rawPolicyText, sourceLanguages, sourceUrl } =
      data.verification;
    const hasMethod = method !== "";
    const hasVerifiedAt = verifiedAt !== "";

    // 원문 스냅샷은 Verification 행에 실린다. 확인 방법·확인일이 없으면 담을 행이
    // 없으므로 입력을 조용히 버리는 대신 무엇이 빠졌는지 알린다.
    const hasSnapshot =
      (rawPolicyText ?? "").trim() !== "" ||
      sourceLanguages.length > 0 ||
      (sourceUrl ?? "").trim() !== "";

    if (!hasMethod && !hasVerifiedAt && hasSnapshot) {
      ctx.addIssue({
        code: "custom" as const,
        message: "snapshotWithoutVerification",
        path: ["verification"],
      });
      return;
    }

    if (hasMethod !== hasVerifiedAt) {
      ctx.addIssue({
        code: "custom" as const,
        message: "verificationIncomplete",
        path: ["verification"],
      });
      return;
    }

    if (hasMethod && hasVerifiedAt) {
      const date = new Date(verifiedAt);
      if (isNaN(date.getTime())) {
        ctx.addIssue({
          code: "custom" as const,
          message: "required",
          path: ["verification", "verifiedAt"],
        });
        return;
      }
      if (!isNotFutureKST(date)) {
        ctx.addIssue({
          code: "custom" as const,
          message: "futureVerifiedAt",
          path: ["verification", "verifiedAt"],
        });
      }
    }
  })
  .transform((data) => {
    const { verification: rawV, ...rest } = data;
    const hasVerification = rawV.method !== "" && rawV.verifiedAt !== "";
    return {
      ...rest,
      verification: hasVerification
        ? {
            method: rawV.method as "PHONE" | "DM" | "WEBSITE" | "ON_SITE",
            verifiedAt: new Date(rawV.verifiedAt),
            note: rawV.note,
            rawPolicyText: rawV.rawPolicyText,
            sourceLanguages: rawV.sourceLanguages,
            sourceUrl: rawV.sourceUrl,
          }
        : undefined,
    };
  });

export type PlaceUpdate = z.infer<typeof placeUpdateSchema>;
