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
} from "@/lib/constants";

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
  instagram: z.string().max(100).nullish(),
  thumbnailUrl: z.string().url().nullish(),
  tourApiId: z.string().nullish(),
  visibility: z.enum(PLACE_VISIBILITY).default("DRAFT"),

  condition: z.object({
    indoor: z.enum(INDOOR_POLICIES),
    carrierStrollerPolicy: z.enum(CARRIER_STROLLER_POLICIES),
    maxDogSize: z.enum(MAX_DOG_SIZES),
    leash: z.enum(LEASH_POLICIES),
    muzzle: z.enum(MUZZLE_POLICIES),
    breedRestrictions: z.string().max(500).nullish(),
    requiredItems: z.array(z.enum(REQUIRED_ITEMS)),
    cautions: z.string().max(1000).nullish(),
  }),

  verification: z.object({
    method: z.enum(["PHONE", "DM", "WEBSITE", "ON_SITE"]),
    verifiedAt: z.coerce.date(),
    note: z.string().max(500).optional(),
  }),
});

export type PlaceInput = z.infer<typeof placeInputSchema>;
