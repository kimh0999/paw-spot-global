-- Migration: operating_hours
-- Date: 2026-09-08
--
-- 운영시간을 요일별 구조로 저장하기 위한 데이터 계층.
-- 근거: docs/Paw_Spot_Global_개발명세서_v2.md §3-4 (결정 D-04), 기획서 v3 P0-15
--
-- 1) Place.hours (JSONB, nullable)
--    요일별 영업시간. { mon: { open: "09:00", close: "21:00" } | null, ... sun }
--    요일 값이 NULL이면 그날은 휴무다. 형식은
--    src/lib/places/operating-hours.ts의 operatingHoursSchema가 강제한다.
--
--    자유 텍스트 단독 저장을 금지한다 — 운영자가 한국어로 적으면 영어 UI 사용자가
--    읽을 수 없어 서비스 전제가 무너진다(§3-4). DB에는 요일 키와 HH:MM만 두고
--    요일명은 화면이 locale에 맞게 렌더한다.
--
-- 2) Place.hoursNote (TEXT, nullable)
--    브레이크타임·정기휴무 같은 짧은 보조 정보 1줄. 운영시간 본체를 대신하지 않는다.
--    자정을 넘겨 영업하는 매장은 close를 23:59로 두고 실제 마감을 여기에 적는다.
--
-- 파괴적 변경 없음 — 컬럼 추가만 한다. 기존 행은 둘 다 NULL로 남는다.
-- NULL은 "휴무"가 아니라 "아직 입력되지 않음"이며 backfill로 추측해 채우지 않는다.

-- AlterTable
ALTER TABLE "Place"
  ADD COLUMN "hours"     JSONB,
  ADD COLUMN "hoursNote" TEXT;
