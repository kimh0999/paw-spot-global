import { z } from "zod";

import { DOG_SIZES } from "@/lib/constants";

export const dogInputSchema = z.object({
  name: z.string().min(1).max(30),
  size: z.enum(DOG_SIZES),
  breed: z.string().max(50).nullish(),
});

export type DogInput = z.infer<typeof dogInputSchema>;
