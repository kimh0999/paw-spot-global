-- 장소 소개와 주차 정보를 담을 자리를 만든다.
--
-- **추가만 하는 비파괴 변경이다.** 기존 컬럼·데이터는 건드리지 않는다.
--   - 새 enum 1개 (ParkingAvailability)
--   - Place에 nullable 컬럼 3개 + DEFAULT 있는 enum 컬럼 1개
--
-- 잠금: `ADD COLUMN`에 DEFAULT가 있어도 PostgreSQL 11+는 테이블을 다시 쓰지 않는다
-- (기본값은 카탈로그에 저장된다). ACCESS EXCLUSIVE 잠금은 잡히지만 상수 시간이라
-- 장소 수천 건 규모에서 사실상 즉시 끝난다.
--
-- 적용 순서: **DB 먼저, 애플리케이션 나중.** 옛 코드는 새 컬럼을 select하지 않으므로
-- 먼저 생겨도 아무 동작에 영향이 없다. 반대로 하면 새 컬럼을 읽는 쿼리가 깨진다.

CREATE TYPE "ParkingAvailability" AS ENUM ('AVAILABLE', 'UNAVAILABLE', 'UNKNOWN');

ALTER TABLE "Place"
  ADD COLUMN "descriptionKr" TEXT,
  ADD COLUMN "descriptionEn" TEXT,
  ADD COLUMN "parking" "ParkingAvailability" NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN "parkingNote" TEXT,
  -- 계절별·시설별 시간, "상시 개방", 주차 상세처럼 `hours`로 옮길 수 없는 안내.
  -- 범위를 지운 채 `hours`에 밀어 넣지 않기 위한 자리다.
  ADD COLUMN "usageGuideKr" TEXT,
  ADD COLUMN "usageGuideEn" TEXT;
