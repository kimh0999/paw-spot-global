import { z } from "zod";

/**
 * `Place.hours`에 담기는 요일별 운영시간 (결정 D-04, 개발명세서 v2 §3-4).
 *
 * **자유 텍스트 단독 저장을 금지한다.** 운영자가 한국어로 적으면 영어 UI 사용자가 읽을 수
 * 없어 서비스 전제가 무너진다. DB에는 요일 키와 `HH:MM`만 두고, 요일명은 화면이 locale에
 * 맞게 렌더한다.
 *
 * 브레이크타임·정기휴무는 MVP 범위 밖이고 `Place.hoursNote` 한 줄로 대신한다.
 */

/** 저장 순서이자 화면 표시 순서. 월요일부터 시작한다. */
export const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type DayKey = (typeof DAY_KEYS)[number];

/** 24시간 표기 `HH:MM`. `9:00`이나 `24:00`은 받지 않는다. */
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** `hoursNote` 최대 길이. 운영시간 본체를 대신하는 용도가 아니다(§3-4). */
export const HOURS_NOTE_MAX_LENGTH = 100;

const dayHoursSchema = z
  .strictObject({
    open: z.string().regex(TIME_PATTERN),
    close: z.string().regex(TIME_PATTERN),
  })
  // `HH:MM`은 0으로 채워진 고정 폭이라 문자열 비교가 곧 시각 비교다.
  .refine((value) => value.open < value.close, {
    message: "openBeforeClose",
    path: ["close"],
  });

export type DayHours = z.infer<typeof dayHoursSchema>;

/** 요일 값이 `null`이면 그날은 **휴무**다. 키가 빠지는 것은 허용하지 않는다. */
export const operatingHoursSchema = z.strictObject({
  mon: dayHoursSchema.nullable(),
  tue: dayHoursSchema.nullable(),
  wed: dayHoursSchema.nullable(),
  thu: dayHoursSchema.nullable(),
  fri: dayHoursSchema.nullable(),
  sat: dayHoursSchema.nullable(),
  sun: dayHoursSchema.nullable(),
});

export type OperatingHours = z.infer<typeof operatingHoursSchema>;

/** 모든 요일이 휴무인 상태. "아직 입력하지 않음"과는 다르다 — 그쪽은 컬럼이 NULL이다. */
export const EMPTY_OPERATING_HOURS: OperatingHours = {
  mon: null,
  tue: null,
  wed: null,
  thu: null,
  fri: null,
  sat: null,
  sun: null,
};

/**
 * DB의 Json 컬럼을 읽은 결과.
 *
 * `empty`(아직 입력되지 않음)와 `invalid`(값이 있는데 형식이 깨짐)를 구분한다.
 * 둘을 모두 null로 뭉개면 잘못된 데이터가 "운영시간 없음"처럼 보여 조용히 사라진다.
 * `readPolicyDetails`와 같은 형태다.
 */
export type OperatingHoursRead =
  | { status: "empty"; value: null }
  | { status: "ok"; value: OperatingHours }
  | { status: "invalid"; value: null; issues: string[] };

export function readOperatingHours(value: unknown): OperatingHoursRead {
  if (value == null) return { status: "empty", value: null };

  const parsed = operatingHoursSchema.safeParse(value);
  if (parsed.success) return { status: "ok", value: parsed.data };

  return {
    status: "invalid",
    value: null,
    issues: parsed.error.issues.map(
      (issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`,
    ),
  };
}

/** 일주일 내내 휴무인가. 입력은 됐지만 볼 것이 없는 상태를 화면이 구분하는 데 쓴다. */
export function isAllClosed(hours: OperatingHours): boolean {
  return DAY_KEYS.every((day) => hours[day] === null);
}

/**
 * 같은 시간대가 이어지는 요일을 묶는다. `월–금 09:00–21:00`처럼 줄여 쓰기 위한 것이다.
 *
 * **연속된 요일만 묶는다.** 월·수·금이 같아도 화요일이 다르면 세 덩어리로 남긴다 —
 * 떨어진 요일을 한 줄로 합치면 그 사이 요일도 같은 것처럼 읽힌다.
 */
export type HoursGroup = {
  days: DayKey[];
  hours: DayHours | null;
};

export function groupConsecutiveDays(hours: OperatingHours): HoursGroup[] {
  const groups: HoursGroup[] = [];

  for (const day of DAY_KEYS) {
    const value = hours[day];
    const last = groups[groups.length - 1];
    const sameAsLast =
      last != null &&
      (last.hours === null
        ? value === null
        : value !== null &&
          last.hours.open === value.open &&
          last.hours.close === value.close);

    if (sameAsLast) last.days.push(day);
    else groups.push({ days: [day], hours: value });
  }

  return groups;
}
