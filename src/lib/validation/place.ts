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
  VACCINATION_CERTIFICATE_POLICIES,
} from "@/lib/constants";

// @handle, handle, or instagram.com URL
const INSTAGRAM_REGEX =
  /^(@?[a-zA-Z0-9_.]{1,30}|https?:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9_.]+\/?)$/;

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function isNotFutureKST(date: Date): boolean {
  const nowKST = new Date(Date.now() + KST_OFFSET_MS);
  const todayKST = nowKST.toISOString().slice(0, 10);
  const verifiedKST = new Date(date.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
  return verifiedKST <= todayKST;
}

const verificationSchema = z.object({
  method: z.enum(["PHONE", "DM", "WEBSITE", "ON_SITE"]),
  verifiedAt: z.coerce.date().refine(isNotFutureKST, { message: "futureVerifiedAt" }),
  note: z.string().max(500).optional(),
});

export const placeInputSchema = z.object({
  nameKr: z.string().min(1).max(200),
  nameEn: z.string().max(200).nullish(),
  category: z.enum(PLACE_CATEGORIES),
  address: z.string().min(1).max(500),
  location: z.object({
    lat: z.number().min(33).max(43),
    lng: z.number().min(124).max(132),
  }),
  phone: z.string().max(30).nullish(),
  website: z.string().url().nullish(),
  instagram: z
    .string()
    .max(100)
    .nullish()
    .refine((val) => !val || INSTAGRAM_REGEX.test(val), { message: "invalidInstagram" }),
  thumbnailUrl: z.string().url().nullish(),
  tourApiId: z.string().nullish(),
  visibility: z.enum(PLACE_VISIBILITY).default("DRAFT"),

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
  }),

  verification: verificationSchema,
});

export type PlaceInput = z.infer<typeof placeInputSchema>;

export const placeUpdateSchema = placeInputSchema.extend({
  verification: verificationSchema.optional(),
});

export type PlaceUpdate = z.infer<typeof placeUpdateSchema>;
