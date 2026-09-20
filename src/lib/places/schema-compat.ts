import { prisma } from "@/lib/db/prisma";

/**
 * **임시 호환 장치.** 마이그레이션 `20260920000000_place_description_parking`이
 * 아직 적용되지 않은 DB에서도 화면이 뜨게 한다.
 *
 * 왜 필요한가 — 이 저장소는 스키마·코드가 먼저 올라가고 운영 DB 적용은 승인 뒤에 한다.
 * 그 사이에 새 컬럼을 `select`하면 **장소 상세가 통째로 500**이 된다(실측).
 * `Place`에 컬럼이 없다는 것은 "값이 없다"가 아니라 "아직 이 DB에 기능이 없다"이므로,
 * 화면은 값이 비어 있을 때와 같은 모습으로 떨어져야 한다.
 *
 * **마이그레이션을 적용한 뒤 이 파일과 사용처를 지운다.** 지우는 법:
 *   1. `queries.ts`에서 `readDescriptionParking` 호출을 없애고 컬럼을 Prisma `select`에 직접 넣는다.
 *   2. 이 파일과 `schema-compat.test.ts`를 지운다.
 *
 * 한 프로세스에서 한 번만 확인하고 결과를 기억한다 — 페이지마다 카탈로그를 뒤지지 않는다.
 */

/** 이 장치가 설명하는 컬럼. 하나라도 없으면 없는 것으로 본다. */
const COLUMNS = [
  "descriptionKr",
  "descriptionEn",
  "parking",
  "parkingNote",
  "usageGuideKr",
  "usageGuideEn",
] as const;

export type DescriptionParking = {
  descriptionKr: string | null;
  descriptionEn: string | null;
  parking: "AVAILABLE" | "UNAVAILABLE" | "UNKNOWN";
  parkingNote: string | null;
  usageGuideKr: string | null;
  usageGuideEn: string | null;
};

/** 컬럼이 없는 DB에서 쓰는 값. `UNKNOWN`은 "주차 불가"가 아니라 "확인되지 않음"이다. */
export const MISSING_DESCRIPTION_PARKING: DescriptionParking = {
  descriptionKr: null,
  descriptionEn: null,
  parking: "UNKNOWN",
  parkingNote: null,
  usageGuideKr: null,
  usageGuideEn: null,
};

let columnsPresent: Promise<boolean> | null = null;

function probe(): Promise<boolean> {
  return prisma
    .$queryRaw<{ count: bigint }[]>`
      SELECT count(*) AS count
        FROM information_schema.columns
       WHERE table_schema = current_schema()
         AND table_name = 'Place'
         AND column_name = ANY (${[...COLUMNS]}::text[])
    `
    .then((rows) => Number(rows[0]?.count ?? 0) === COLUMNS.length)
    .catch(() => false);
}

export function hasDescriptionParkingColumns(): Promise<boolean> {
  columnsPresent ??= probe();
  return columnsPresent;
}

/** 테스트에서 DB를 바꿔 끼울 때 쓴다. 제품 코드는 부르지 않는다. */
export function resetSchemaCompatCache(): void {
  columnsPresent = null;
}

/**
 * 한 장소의 소개·주차를 읽는다. 컬럼이 없으면 **빈 값처럼** 돌려준다.
 * 조회가 실패해도 화면을 세우지 않는다 — 소개·주차는 장소 상세의 본체가 아니다.
 */
export async function readDescriptionParking(placeId: string): Promise<DescriptionParking> {
  if (!(await hasDescriptionParkingColumns())) return MISSING_DESCRIPTION_PARKING;

  const rows = await prisma.$queryRaw<
    {
      descriptionKr: string | null;
      descriptionEn: string | null;
      parking: string | null;
      parkingNote: string | null;
      usageGuideKr: string | null;
      usageGuideEn: string | null;
    }[]
  >`
    SELECT "descriptionKr", "descriptionEn", parking::text AS parking, "parkingNote",
           "usageGuideKr", "usageGuideEn"
      FROM "Place"
     WHERE id = ${placeId}
  `;
  const row = rows[0];
  if (!row) return MISSING_DESCRIPTION_PARKING;

  const parking =
    row.parking === "AVAILABLE" || row.parking === "UNAVAILABLE" ? row.parking : "UNKNOWN";
  return {
    descriptionKr: row.descriptionKr ?? null,
    descriptionEn: row.descriptionEn ?? null,
    parking,
    parkingNote: row.parkingNote ?? null,
    usageGuideKr: row.usageGuideKr ?? null,
    usageGuideEn: row.usageGuideEn ?? null,
  };
}
