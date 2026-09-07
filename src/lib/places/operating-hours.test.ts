import { describe, expect, it } from "vitest";

import {
  EMPTY_OPERATING_HOURS,
  groupConsecutiveDays,
  isAllClosed,
  operatingHoursSchema,
  readOperatingHours,
} from "./operating-hours";

const weekday = { open: "09:00", close: "21:00" };
const weekend = { open: "10:00", close: "18:00" };

const full = {
  mon: weekday,
  tue: weekday,
  wed: weekday,
  thu: weekday,
  fri: weekday,
  sat: weekend,
  sun: null,
};

describe("operatingHoursSchema", () => {
  it("요일 7개가 모두 있으면 통과한다", () => {
    expect(operatingHoursSchema.safeParse(full).success).toBe(true);
  });

  it("요일이 빠지면 거른다 — 키 누락과 휴무는 다르다", () => {
    const { sun, ...missing } = full;
    void sun;
    expect(operatingHoursSchema.safeParse(missing).success).toBe(false);
  });

  it("모르는 키를 거른다", () => {
    expect(
      operatingHoursSchema.safeParse({ ...full, holiday: weekday }).success,
    ).toBe(false);
  });

  it.each(["9:00", "24:00", "09:60", "0900", "09:00:00", ""])(
    "%s 는 HH:MM 이 아니라 거른다",
    (open) => {
      expect(
        operatingHoursSchema.safeParse({ ...full, mon: { open, close: "21:00" } }).success,
      ).toBe(false);
    },
  );

  it("open이 close보다 늦거나 같으면 거른다", () => {
    expect(
      operatingHoursSchema.safeParse({ ...full, mon: { open: "21:00", close: "09:00" } })
        .success,
    ).toBe(false);
    expect(
      operatingHoursSchema.safeParse({ ...full, mon: { open: "09:00", close: "09:00" } })
        .success,
    ).toBe(false);
  });

  it("자정 직전까지 여는 매장을 받는다 — 자정 넘김은 23:59 + hoursNote로 처리한다", () => {
    expect(
      operatingHoursSchema.safeParse({ ...full, fri: { open: "18:00", close: "23:59" } })
        .success,
    ).toBe(true);
  });
});

describe("readOperatingHours", () => {
  it("값이 없으면 empty — 아직 입력되지 않은 상태", () => {
    expect(readOperatingHours(null).status).toBe("empty");
    expect(readOperatingHours(undefined).status).toBe("empty");
  });

  it("형식이 맞으면 ok", () => {
    const read = readOperatingHours(full);
    expect(read.status).toBe("ok");
    expect(read.value).toEqual(full);
  });

  it("값이 있는데 깨졌으면 invalid — empty와 뭉개지 않는다", () => {
    const read = readOperatingHours({ ...full, mon: { open: "9시", close: "21:00" } });
    expect(read.status).toBe("invalid");
    expect(read.value).toBeNull();
    if (read.status === "invalid") expect(read.issues.length).toBeGreaterThan(0);
  });
});

describe("isAllClosed", () => {
  it("전 요일 휴무를 알아본다", () => {
    expect(isAllClosed(EMPTY_OPERATING_HOURS)).toBe(true);
    expect(isAllClosed(full)).toBe(false);
  });
});

describe("groupConsecutiveDays", () => {
  it("이어지는 같은 시간대를 묶는다", () => {
    const groups = groupConsecutiveDays(full);
    expect(groups.map((g) => g.days)).toEqual([
      ["mon", "tue", "wed", "thu", "fri"],
      ["sat"],
      ["sun"],
    ]);
    expect(groups[0].hours).toEqual(weekday);
    expect(groups[2].hours).toBeNull();
  });

  it("떨어진 요일은 합치지 않는다 — 사이 요일이 같은 것처럼 읽히면 안 된다", () => {
    const alternating = {
      ...EMPTY_OPERATING_HOURS,
      mon: weekday,
      tue: null,
      wed: weekday,
    };
    const groups = groupConsecutiveDays(alternating);
    expect(groups.map((g) => g.days)).toEqual([
      ["mon"],
      ["tue"],
      ["wed"],
      ["thu", "fri", "sat", "sun"],
    ]);
  });

  it("전 요일이 같으면 한 덩어리다", () => {
    const everyday = {
      mon: weekday, tue: weekday, wed: weekday, thu: weekday,
      fri: weekday, sat: weekday, sun: weekday,
    };
    expect(groupConsecutiveDays(everyday)).toHaveLength(1);
  });
});
