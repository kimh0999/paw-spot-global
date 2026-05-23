import { Prisma } from "@prisma/client";

export function pointFromLngLat(lng: number, lat: number): Prisma.Sql {
  return Prisma.sql`ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography`;
}
