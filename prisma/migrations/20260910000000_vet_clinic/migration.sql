-- Migration: vet_clinic
-- Date: 2026-09-10
--
-- 동물병원 탐색·문의 P0의 데이터 계층 (결정 D-16 ~ D-20).
-- 근거: docs/02-design/동물병원-탐색-문의-P0.design.md
--       docs/04-report/Paw_Spot_Global_Vet_Clinic_Plan_v0.1.md §6
--
-- 병원은 Place와 분리된 도메인이다. Category에 VET을 더하지 않는 이유:
--   (a) Place.location이 non-null이라 좌표 미확보 병원을 담을 수 없다.
--   (b) Verification.placeId가 필수 FK라 항목별 확인 기록을 붙일 수 없다.
--   (c) VET이 Category에 들어오면 홈 카테고리 탭·filterPlaces·반려견 입장 판정에 흘러든다.
--
-- **파괴적 변경 없음.** 기존 테이블·enum·데이터를 건드리지 않고 새 enum 2개와
-- 테이블 2개만 추가한다. PlaceVisibility·VerificationMethod는 도메인 중립이라 재사용한다.
--
-- 전제: PostGIS extension이 이미 설치돼 있다(Place.location이 geography를 쓰고 있다).

-- CreateEnum
CREATE TYPE "VetServiceStatus" AS ENUM ('AVAILABLE', 'CONDITIONAL', 'UNAVAILABLE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "VetVerificationTarget" AS ENUM ('BASIC', 'HOURS', 'ENGLISH_SUPPORT', 'AFTER_HOURS');

-- CreateTable
-- location은 Place와 달리 NULL을 허용한다. 좌표를 확보하지 못해도 검색·연락은 가능해야 하고,
-- 거리는 좌표가 있을 때만 만든다.
CREATE TABLE "VetClinic" (
    "id"                      TEXT NOT NULL,
    "nameKr"                  TEXT NOT NULL,
    "nameEn"                  TEXT,
    "district"                TEXT NOT NULL,
    "address"                 TEXT NOT NULL,
    "phone"                   TEXT NOT NULL,
    "location"                geography(Point, 4326),
    "website"                 TEXT,
    "hours"                   JSONB,
    "hoursNote"               TEXT,
    "englishSupport"          "VetServiceStatus" NOT NULL DEFAULT 'UNKNOWN',
    "englishSupportCondition" TEXT,
    "afterHours"              "VetServiceStatus" NOT NULL DEFAULT 'UNKNOWN',
    "afterHoursCondition"     TEXT,
    "visibility"              "PlaceVisibility" NOT NULL DEFAULT 'DRAFT',
    "adminNote"               TEXT,
    "collectedAt"             TIMESTAMP(3),
    "createdAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"               TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VetClinic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
-- verifiedValue는 이 기록이 확인한 값의 스냅샷이다(D-17). 현재 값과 다르면 화면은
-- 그 항목을 미확인으로 읽는다 — 옛 값의 확인 기록이 새 값을 검증한 것처럼 보이지 않게 한다.
CREATE TABLE "VetVerification" (
    "id"            TEXT NOT NULL,
    "clinicId"      TEXT NOT NULL,
    "target"        "VetVerificationTarget" NOT NULL,
    "method"        "VerificationMethod" NOT NULL,
    "verifiedBy"    TEXT NOT NULL,
    "verifiedAt"    TIMESTAMP(3) NOT NULL,
    "sourceUrl"     TEXT,
    "note"          TEXT,
    "verifiedValue" TEXT,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VetVerification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VetClinic_visibility_idx" ON "VetClinic"("visibility");
CREATE INDEX "VetClinic_district_idx" ON "VetClinic"("district");
CREATE INDEX "VetVerification_clinicId_target_idx" ON "VetVerification"("clinicId", "target");

-- AddForeignKey
ALTER TABLE "VetVerification"
  ADD CONSTRAINT "VetVerification_clinicId_fkey"
  FOREIGN KEY ("clinicId") REFERENCES "VetClinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
