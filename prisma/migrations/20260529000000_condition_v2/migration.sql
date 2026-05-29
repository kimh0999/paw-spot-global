-- Migration: condition_v2
-- Date: 2026-05-29
--
-- DESTRUCTIVE CHANGES (dev data only — no production data preserved):
--   Removed columns:
--     - PlaceCondition.carrier (CarrierPolicy)       → replaced by carrierStrollerPolicy
--     - PlaceCondition.strollerAllowed (Boolean)     → not migrated (was "strollers allowed", not "required")
--     - PlaceCondition.allowedSizes (DogSize[])      → replaced by maxDogSize (all existing rows → UNKNOWN)
--   Cleaned from requiredItems array:
--     - CARRIER, STROLLER, LEASH, MUZZLE entries removed from existing rows
--       (now covered by carrierStrollerPolicy, leash, muzzle dedicated fields)
--
-- NOTE: CarrierPolicy enum type is intentionally NOT dropped here.
--       It is retained in schema.prisma to prevent accidental DB removal.
--       Remove in a separate migration after confirming zero references remain.

-- Step 1: Add PARTIAL_AREA to IndoorPolicy enum
ALTER TYPE "IndoorPolicy" ADD VALUE IF NOT EXISTS 'PARTIAL_AREA' AFTER 'OUTDOOR_ONLY';

-- Step 2: Create new enum types
CREATE TYPE "MaxDogSize" AS ENUM ('SMALL', 'MEDIUM', 'LARGE', 'UNKNOWN');
CREATE TYPE "CarrierStrollerPolicy" AS ENUM ('REQUIRED', 'NOT_REQUIRED', 'UNKNOWN');
CREATE TYPE "LeashPolicy" AS ENUM ('REQUIRED', 'NOT_REQUIRED', 'PARTIAL_AREA', 'UNKNOWN');
CREATE TYPE "MuzzlePolicy" AS ENUM ('REQUIRED', 'NOT_REQUIRED', 'CONDITIONAL', 'UNKNOWN');

-- Step 3: Add new columns with UNKNOWN defaults (existing rows get UNKNOWN)
ALTER TABLE "PlaceCondition"
  ADD COLUMN "maxDogSize"            "MaxDogSize"            NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN "carrierStrollerPolicy" "CarrierStrollerPolicy" NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN "leash"                 "LeashPolicy"           NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN "muzzle"                "MuzzlePolicy"          NOT NULL DEFAULT 'UNKNOWN';

-- Step 4: Clean requiredItems — remove items now covered by dedicated fields
UPDATE "PlaceCondition"
  SET "requiredItems" = (
    SELECT array_agg(item)
    FROM unnest("requiredItems") AS item
    WHERE item NOT IN ('CARRIER', 'STROLLER', 'LEASH', 'MUZZLE')
  )
  WHERE "requiredItems" && ARRAY['CARRIER', 'STROLLER', 'LEASH', 'MUZZLE']::text[];

-- Ensure no NULL array from the above update
UPDATE "PlaceCondition"
  SET "requiredItems" = ARRAY[]::text[]
  WHERE "requiredItems" IS NULL;

-- Step 5: Drop obsolete columns
ALTER TABLE "PlaceCondition"
  DROP COLUMN "carrier",
  DROP COLUMN "strollerAllowed",
  DROP COLUMN "allowedSizes";
