-- Migration: place_image_attribution
-- Date: 2026-09-18
--
-- 대표 이미지의 출처 기록 (결정 D-22).
-- 근거: docs/02-design/TourAPI-활용-계획-기준.md §5·§9
--
-- 한국관광공사 TourAPI가 내려주는 `firstimage`는 `cpyrhtDivCd`에 따라 이용 조건이 다르다.
-- 공공누리(KOGL) 네 유형은 모두 **출처 표시**를 요구한다
-- (https://www.kogl.or.kr/info/licenseType1.do).
-- 지금까지 이 정보는 `data/tour-api/*.meta.json` 파일에만 있었고 DB에는 남지 않았다.
-- 파일을 지우면 근거가 사라지므로 등록과 함께 DB로 옮긴다.
--
-- **파괴적 변경 없음.** 기존 테이블·컬럼·데이터를 건드리지 않는다.
-- enum 1개와 테이블 1개만 추가한다. 기존 장소는 행이 없고, 행이 없으면
-- "출처 조건이 없는 이미지"로 읽혀 지금과 똑같이 렌더링된다.

-- CreateEnum
CREATE TYPE "ImageLicenseType" AS ENUM ('KOGL_TYPE1', 'KOGL_TYPE2', 'KOGL_TYPE3', 'KOGL_TYPE4', 'UNKNOWN');

-- CreateTable
-- imageUrl은 이 기록이 설명하는 이미지의 스냅샷이다. Place.thumbnailUrl이 바뀌면
-- 값이 어긋나고, 애플리케이션은 어긋난 기록을 승계하지 않는다.
-- reviewedAt이 NULL이면 사람 검토 전이므로 공개 화면에 이미지를 내보내지 않는다.
CREATE TABLE "PlaceImageAttribution" (
    "id"                   TEXT NOT NULL,
    "placeId"              TEXT NOT NULL,
    "imageUrl"             TEXT NOT NULL,
    "provider"             TEXT NOT NULL,
    "copyrightHolder"      TEXT,
    "workTitle"            TEXT,
    "createdYear"          INTEGER,
    "sourceUrl"            TEXT NOT NULL,
    "licenseType"          "ImageLicenseType" NOT NULL DEFAULT 'UNKNOWN',
    "licenseUrl"           TEXT,
    "reviewedBy"           TEXT,
    "reviewedAt"           TIMESTAMP(3),
    "preparationId"        TEXT,
    "sourceSnapshotSha256" TEXT,
    "sourceFetchedAt"      TIMESTAMP(3),
    "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"            TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlaceImageAttribution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlaceImageAttribution_placeId_key" ON "PlaceImageAttribution"("placeId");

-- AddForeignKey
ALTER TABLE "PlaceImageAttribution"
  ADD CONSTRAINT "PlaceImageAttribution_placeId_fkey"
  FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;
