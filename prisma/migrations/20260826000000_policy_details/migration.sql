-- Migration: policy_details
-- Date: 2026-08-26
--
-- 자유 텍스트 안내문을 표준 항목으로 구조화하기 위한 데이터 계층.
-- 근거: docs/analysis-pet-conditions.md §C-2, §E-3 (D-01=2A, D-03)
--
-- 1) PlaceCondition.policyDetails (JSONB, nullable)
--    컬럼으로 표현할 수 없는 복합 이용수칙 — 준비물의 AND/OR, 매장 내 상태,
--    공간 예외, 행동 제한, 요금, 위생 수칙, 항목별 불확실성.
--    형식은 src/lib/places/policy-details.ts의 policyDetailsSchema가 강제한다.
--
-- 2) Verification의 원문 스냅샷 3개 컬럼
--    확인 당시의 안내문 원문·언어·출처. PlaceCondition에는 현재 공개 중인 구조화 값만
--    남기고 원문은 확인 시점 단위로 쌓아 과거 근거를 보존한다.
--
-- 기존 조건 컬럼 9개와 enum은 건드리지 않는다. 파괴적 변경 없음 — 컬럼 추가만 한다.
-- 기존 행은 policyDetails가 NULL, sourceLanguages가 빈 배열로 남는다.
-- NULL은 "제한 없음"이 아니라 "확인되지 않음"이며 backfill로 추측해 채우지 않는다.

-- AlterTable
ALTER TABLE "PlaceCondition" ADD COLUMN "policyDetails" JSONB;

-- AlterTable
-- sourceLanguages의 DDL은 `prisma migrate diff --from-empty --to-schema`가 내는 형태와
-- 같게 둔다(NOT NULL 없이 DEFAULT만). 기존 requiredItems TEXT[]도 같은 형태이며,
-- DEFAULT가 있으므로 기존 행은 NULL이 아니라 빈 배열로 채워진다.
ALTER TABLE "Verification"
  ADD COLUMN "rawPolicyText"   TEXT,
  ADD COLUMN "sourceLanguages" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "sourceUrl"       TEXT;
