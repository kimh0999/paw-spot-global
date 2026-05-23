import { z } from "zod";

import { DOG_SIZES, PLACE_CATEGORIES } from "@/lib/constants";

const booleanQuerySchema = z
  .union([z.boolean(), z.enum(["true", "false"])])
  .transform((v) => v === true || v === "true");

export const placeFiltersSchema = z.object({
  category: z.enum(PLACE_CATEGORIES).optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  radiusMeters: z.coerce.number().min(100).max(20000).default(2000),
  sizes: z.array(z.enum(DOG_SIZES)).optional(),
  indoorRequired: booleanQuerySchema.optional(),
  carrierFree: booleanQuerySchema.optional(),
  strollerAllowed: booleanQuerySchema.optional(),
  sort: z.enum(["distance", "recently_checked"]).default("distance"),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
});

export type PlaceFilters = z.infer<typeof placeFiltersSchema>;
