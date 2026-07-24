-- Migration: carrier_stroller_3state
-- Date: 2026-07-06
--
-- Expands CarrierStrollerPolicy from 3-state to 4-state:
--   OLD: REQUIRED, NOT_REQUIRED, UNKNOWN
--   NEW: NOT_REQUIRED, REQUIRED_INDOOR, REQUIRED_ALWAYS, UNKNOWN
--
-- Existing-value mapping (verified against DB 2026-07-06: 0 REQUIRED rows,
--   2 NOT_REQUIRED, 2 UNKNOWN):
--   REQUIRED      -> REQUIRED_ALWAYS   (over-restrict is safer than under-restrict)
--   NOT_REQUIRED  -> NOT_REQUIRED
--   UNKNOWN       -> UNKNOWN
--
-- DESTRUCTIVE: recreates the enum type (rename old -> create new -> cast column -> drop old).

-- Step 1: Rename existing enum type
ALTER TYPE "CarrierStrollerPolicy" RENAME TO "CarrierStrollerPolicy_old";

-- Step 2: Create new enum type
CREATE TYPE "CarrierStrollerPolicy" AS ENUM ('NOT_REQUIRED', 'REQUIRED_INDOOR', 'REQUIRED_ALWAYS', 'UNKNOWN');

-- Step 3: Drop column default before retyping (default is bound to the old type)
ALTER TABLE "PlaceCondition" ALTER COLUMN "carrierStrollerPolicy" DROP DEFAULT;

-- Step 4: Cast column to new type, mapping REQUIRED -> REQUIRED_ALWAYS
ALTER TABLE "PlaceCondition"
  ALTER COLUMN "carrierStrollerPolicy" TYPE "CarrierStrollerPolicy"
  USING (
    CASE "carrierStrollerPolicy"::text
      WHEN 'REQUIRED' THEN 'REQUIRED_ALWAYS'
      ELSE "carrierStrollerPolicy"::text
    END::"CarrierStrollerPolicy"
  );

-- Step 5: Restore default
ALTER TABLE "PlaceCondition" ALTER COLUMN "carrierStrollerPolicy" SET DEFAULT 'UNKNOWN';

-- Step 6: Drop old enum type
DROP TYPE "CarrierStrollerPolicy_old";
