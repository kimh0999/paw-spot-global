import { prisma } from "@/lib/db/prisma";
import { haversineDistance } from "@/lib/geo/distance";
import { readOperatingHours } from "@/lib/places/operating-hours";
import { isVetDistrict, type VetDistrict } from "./constants";
import { basicSnapshot } from "./publish";
import type { VetClinicDetail, VetClinicListItem } from "./types";
import {
  resolveVetItem,
  serviceSnapshot,
  vetValueSnapshot,
  type VetVerificationRecord,
} from "./verification";

/**
 * 병원 조회.
 *
 * **사용자 화면에는 `VISIBLE`만 내보낸다.** 임시저장(`DRAFT`)·숨김(`HIDDEN`)은 목록에도
 * 상세에도 나오지 않는다 — 아직 검수하지 않은 연락처를 내보내면 서비스 전제가 무너진다.
 * `adminNote`는 select에 넣지 않는다. 타입에서 뺐지만 쿼리에서도 막아 둔다.
 */

const PUBLIC_SELECT = {
  id: true,
  nameKr: true,
  nameEn: true,
  district: true,
  address: true,
  phone: true,
  website: true,
  hours: true,
  hoursNote: true,
  englishSupport: true,
  englishSupportCondition: true,
  afterHours: true,
  afterHoursCondition: true,
  collectedAt: true,
  updatedAt: true,
  verifications: {
    select: {
      target: true,
      method: true,
      verifiedAt: true,
      sourceUrl: true,
      note: true,
      verifiedValue: true,
    },
    orderBy: { verifiedAt: "desc" },
  },
} as const;

type ClinicRow = {
  id: string;
  nameKr: string;
  nameEn: string | null;
  district: string;
  address: string;
  phone: string;
  website: string | null;
  hours: unknown;
  hoursNote: string | null;
  englishSupport: string;
  englishSupportCondition: string | null;
  afterHours: string;
  afterHoursCondition: string | null;
  collectedAt: Date | null;
  updatedAt: Date;
  verifications: {
    target: string;
    method: string;
    verifiedAt: Date;
    sourceUrl: string | null;
    note: string | null;
    verifiedValue: string | null;
  }[];
};

/** 좌표는 geography 컬럼이라 Prisma select로 읽히지 않는다. 필요한 것만 raw로 가져온다. */
async function readCoordinates(ids: string[]): Promise<Map<string, { lat: number; lng: number }>> {
  if (ids.length === 0) return new Map();

  const rows = await prisma.$queryRaw<Array<{ id: string; lat: number | null; lng: number | null }>>`
    SELECT
      "id",
      ST_Y("location"::geometry) AS lat,
      ST_X("location"::geometry) AS lng
    FROM "VetClinic"
    WHERE "id" = ANY(${ids})
  `;

  const map = new Map<string, { lat: number; lng: number }>();
  for (const row of rows) {
    if (row.lat == null || row.lng == null) continue;
    map.set(row.id, { lat: Number(row.lat), lng: Number(row.lng) });
  }
  return map;
}

function toRecords(row: ClinicRow): VetVerificationRecord[] {
  return row.verifications.map((record) => ({
    target: record.target as VetVerificationRecord["target"],
    method: record.method,
    verifiedAt: record.verifiedAt,
    sourceUrl: record.sourceUrl,
    note: record.note,
    verifiedValue: record.verifiedValue,
  }));
}

export function toListItem(
  row: ClinicRow,
  coordinate: { lat: number; lng: number } | null,
  userLocation: { lat: number; lng: number } | null,
  referenceDate: Date,
): VetClinicListItem {
  const records = toRecords(row);
  const hoursRead = readOperatingHours(row.hours);
  const hours = hoursRead.status === "ok" ? hoursRead.value : null;

  const englishStatus = row.englishSupport as VetClinicListItem["englishSupport"];
  const afterHoursStatus = row.afterHours as VetClinicListItem["afterHours"];

  return {
    id: row.id,
    nameKr: row.nameKr,
    nameEn: row.nameEn,
    district: (isVetDistrict(row.district) ? row.district : "seo") as VetDistrict,
    address: row.address,
    phone: row.phone,
    website: row.website,
    location: coordinate,
    // 좌표가 없으면 거리를 만들지 않는다. 위치를 고르지 않았을 때도 만들지 않는다.
    distanceMeters:
      coordinate && userLocation
        ? haversineDistance(userLocation.lat, userLocation.lng, coordinate.lat, coordinate.lng)
        : null,
    hours,
    hoursNote: row.hoursNote,
    englishSupport: englishStatus,
    englishSupportCondition: row.englishSupportCondition,
    afterHours: afterHoursStatus,
    afterHoursCondition: row.afterHoursCondition,
    collectedAt: row.collectedAt ? row.collectedAt.toISOString() : null,
    updatedAt: row.updatedAt.toISOString(),
    verification: {
      basic: resolveVetItem("BASIC", basicSnapshot(row), records, referenceDate),
      hours: resolveVetItem(
        "HOURS",
        vetValueSnapshot(JSON.stringify(hours), "|", row.hoursNote ?? ""),
        records,
        referenceDate,
      ),
      englishSupport: resolveVetItem(
        "ENGLISH_SUPPORT",
        serviceSnapshot(englishStatus, row.englishSupportCondition),
        records,
        referenceDate,
      ),
      afterHours: resolveVetItem(
        "AFTER_HOURS",
        serviceSnapshot(afterHoursStatus, row.afterHoursCondition),
        records,
        referenceDate,
      ),
    },
  };
}

export async function getPublicVetClinics(
  userLocation: { lat: number; lng: number } | null,
  referenceDate: Date = new Date(),
): Promise<VetClinicListItem[]> {
  const rows = (await prisma.vetClinic.findMany({
    where: { visibility: "VISIBLE" },
    select: PUBLIC_SELECT,
  })) as unknown as ClinicRow[];

  const coords = await readCoordinates(rows.map((row) => row.id));
  return rows.map((row) => toListItem(row, coords.get(row.id) ?? null, userLocation, referenceDate));
}

export async function getPublicVetClinicById(
  id: string,
  userLocation: { lat: number; lng: number } | null,
  referenceDate: Date = new Date(),
): Promise<VetClinicDetail | null> {
  const row = (await prisma.vetClinic.findFirst({
    where: { id, visibility: "VISIBLE" },
    select: PUBLIC_SELECT,
  })) as unknown as ClinicRow | null;

  if (!row) return null;

  const coords = await readCoordinates([row.id]);
  return {
    ...toListItem(row, coords.get(row.id) ?? null, userLocation, referenceDate),
    records: toRecords(row),
  };
}

/**
 * sitemap에 실을 병원.
 *
 * 공개 조회와 **같은 `visibility: "VISIBLE"`** 조건이다. `DRAFT`·`HIDDEN`은 상세 URL이
 * 열리지 않으므로 sitemap에도 넣지 않는다.
 */
export async function getSitemapVetClinics(): Promise<{ id: string; updatedAt: Date }[]> {
  return prisma.vetClinic.findMany({
    where: { visibility: "VISIBLE" },
    select: { id: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });
}

export interface AdminVetClinicRow {
  id: string;
  nameKr: string;
  nameEn: string | null;
  district: string;
  address: string;
  phone: string;
  visibility: string;
  updatedAt: Date;
}

export async function getAdminVetClinics(): Promise<AdminVetClinicRow[]> {
  return prisma.vetClinic.findMany({
    select: {
      id: true,
      nameKr: true,
      nameEn: true,
      district: true,
      address: true,
      phone: true,
      visibility: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
  });
}

/**
 * 관리자 수정 화면용. 공개 상태와 무관하게 읽고 `adminNote`와 **확인한 사람**도 포함한다.
 *
 * `verifiedBy`는 공개 select에는 없다 — 운영자 이메일을 사용자 화면으로 내보내지 않는다.
 * 관리자에게는 누가 언제 무엇을 확인했는지 보여야 확인 기록을 관리할 수 있다.
 */
export async function getVetClinicForAdmin(id: string) {
  const row = await prisma.vetClinic.findUnique({
    where: { id },
    select: {
      ...PUBLIC_SELECT,
      visibility: true,
      adminNote: true,
      verifications: {
        select: { ...PUBLIC_SELECT.verifications.select, verifiedBy: true },
        orderBy: { verifiedAt: "desc" },
      },
    },
  });
  if (!row) return null;

  const coords = await readCoordinates([id]);
  return { ...row, location: coords.get(id) ?? null };
}
