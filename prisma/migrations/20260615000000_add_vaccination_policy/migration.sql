-- Migration: add_vaccination_policy
-- Date: 2026-06-15
--
-- Adds VaccinationCertificatePolicy enum and vaccinationCertificatePolicy column
-- to PlaceCondition. Existing rows default to UNKNOWN.

-- Step 1: Create enum type
CREATE TYPE "VaccinationCertificatePolicy" AS ENUM ('REQUIRED', 'NOT_REQUIRED', 'UNKNOWN');

-- Step 2: Add column with UNKNOWN default (existing rows get UNKNOWN)
ALTER TABLE "PlaceCondition"
  ADD COLUMN "vaccinationCertificatePolicy" "VaccinationCertificatePolicy" NOT NULL DEFAULT 'UNKNOWN';
