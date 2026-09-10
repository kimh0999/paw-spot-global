import { z } from "zod";

import { operatingHoursSchema } from "@/lib/places/operating-hours";
import {
  VET_CONDITION_MAX_LENGTH,
  VET_DISTRICTS,
  VET_SERVICE_STATUSES,
  VET_VERIFICATION_TARGETS,
} from "./constants";

/** 빈 문자열을 null로 본다. 폼은 빈 칸을 ""로 보내고 DB는 NULL을 돌려준다. */
const optionalText = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : value))
  .nullable();

/**
 * 조건부 상태는 조건 문구가 있어야 한다.
 *
 * "조건부 가능"이라고만 적으면 사용자는 무엇이 조건인지 알 수 없고, 화면은 조건을 뺀 채
 * 가능처럼 읽힌다. 계획서 §2-A가 요구한 "조건을 함께 노출"을 입력 단계에서 강제한다.
 */
const serviceSchema = z
  .object({
    status: z.enum(VET_SERVICE_STATUSES),
    condition: optionalText,
  })
  .superRefine((value, ctx) => {
    if (value.status === "CONDITIONAL" && !value.condition) {
      ctx.addIssue({
        code: "custom",
        path: ["condition"],
        message: "conditionRequired",
      });
    }
    if (value.condition && value.condition.length > VET_CONDITION_MAX_LENGTH) {
      ctx.addIssue({ code: "custom", path: ["condition"], message: "conditionTooLong" });
    }
  });

export const vetVerificationInputSchema = z.object({
  target: z.enum(VET_VERIFICATION_TARGETS),
  method: z.enum(["PHONE", "DM", "WEBSITE", "ON_SITE", "USER_REPORT"]),
  /** 확인 시각. 미래 날짜는 막는다 — 아직 하지 않은 확인을 기록할 수 없다. */
  verifiedAt: z.coerce.date(),
  sourceUrl: optionalText,
  note: optionalText,
});
export type VetVerificationInput = z.infer<typeof vetVerificationInputSchema>;

export const vetClinicInputSchema = z.object({
  nameKr: z.string().trim().min(1),
  nameEn: optionalText,
  district: z.enum(VET_DISTRICTS),
  address: z.string().trim().min(1),
  phone: z.string().trim().min(1),
  website: optionalText,

  /** 좌표는 선택이다. 없으면 거리를 만들지 않을 뿐 검색·연락은 그대로 된다. */
  location: z
    .object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) })
    .nullable(),

  /** `undefined`는 "제출하지 않음"(기존 값 유지), `null`은 "명시적 초기화"다. */
  hours: operatingHoursSchema.nullable().optional(),
  hoursNote: optionalText.optional(),

  englishSupport: serviceSchema,
  afterHours: serviceSchema,

  visibility: z.enum(["VISIBLE", "HIDDEN", "DRAFT"]),
  adminNote: optionalText,
  collectedAt: z.coerce.date().nullable(),

  /** 이번 저장에서 새로 남기는 확인 기록. 비어 있으면 기존 기록을 그대로 둔다. */
  verifications: z.array(vetVerificationInputSchema).max(4).default([]),
});

export type VetClinicInput = z.infer<typeof vetClinicInputSchema>;
