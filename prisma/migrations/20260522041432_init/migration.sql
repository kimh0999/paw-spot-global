-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "Category" AS ENUM ('RESTAURANT', 'CAFE', 'TRAVEL', 'ETC');

-- CreateEnum
CREATE TYPE "IndoorPolicy" AS ENUM ('ALLOWED', 'OUTDOOR_ONLY', 'NOT_ALLOWED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "DogSize" AS ENUM ('SMALL', 'MEDIUM', 'LARGE');

-- CreateEnum
CREATE TYPE "CarrierPolicy" AS ENUM ('NOT_REQUIRED', 'REQUIRED', 'OPTIONAL', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "VerificationMethod" AS ENUM ('PHONE', 'DM', 'WEBSITE', 'ON_SITE', 'USER_REPORT');

-- CreateEnum
CREATE TYPE "PlaceVisibility" AS ENUM ('VISIBLE', 'HIDDEN', 'DRAFT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "image" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "locale" TEXT NOT NULL DEFAULT 'en',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Place" (
    "id" TEXT NOT NULL,
    "tourApiId" TEXT,
    "nameKr" TEXT NOT NULL,
    "nameEn" TEXT,
    "category" "Category" NOT NULL,
    "address" TEXT NOT NULL,
    "location" geography(Point, 4326) NOT NULL,
    "phone" TEXT,
    "website" TEXT,
    "instagram" TEXT,
    "thumbnailUrl" TEXT,
    "visibility" "PlaceVisibility" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Place_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaceCondition" (
    "id" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "indoor" "IndoorPolicy" NOT NULL,
    "carrier" "CarrierPolicy" NOT NULL,
    "strollerAllowed" BOOLEAN NOT NULL,
    "allowedSizes" "DogSize"[],
    "breedRestrictions" TEXT,
    "requiredItems" TEXT[],
    "cautions" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlaceCondition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "verifiedBy" TEXT NOT NULL,
    "method" "VerificationMethod" NOT NULL,
    "verifiedAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "size" "DogSize" NOT NULL,
    "breed" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Dog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Place_tourApiId_key" ON "Place"("tourApiId");

-- CreateIndex
CREATE INDEX "Place_category_idx" ON "Place"("category");

-- CreateIndex
CREATE INDEX "Place_visibility_idx" ON "Place"("visibility");

-- CreateIndex
CREATE UNIQUE INDEX "PlaceCondition_placeId_key" ON "PlaceCondition"("placeId");

-- CreateIndex
CREATE INDEX "Verification_placeId_idx" ON "Verification"("placeId");

-- AddForeignKey
ALTER TABLE "PlaceCondition" ADD CONSTRAINT "PlaceCondition_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Verification" ADD CONSTRAINT "Verification_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dog" ADD CONSTRAINT "Dog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
