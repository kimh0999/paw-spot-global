import { describe, expect, it } from "vitest";

import { dogInputSchema } from "@/lib/validation/dog";

const base = { name: "별이", size: "SMALL" as const };

describe("dogInputSchema", () => {
  it("이름 앞뒤 공백을 잘라낸다", () => {
    const parsed = dogInputSchema.safeParse({ ...base, name: "  별이  " });
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.name).toBe("별이");
  });

  it("공백만 있는 이름은 거부한다", () => {
    expect(dogInputSchema.safeParse({ ...base, name: "   " }).success).toBe(false);
  });

  it("30자를 넘는 이름은 거부한다", () => {
    expect(
      dogInputSchema.safeParse({ ...base, name: "가".repeat(31) }).success,
    ).toBe(false);
  });

  it("허용되지 않은 breedCode를 거부한다", () => {
    const parsed = dogInputSchema.safeParse({ ...base, breedCode: "wolf" });
    expect(parsed.success).toBe(false);
    expect(parsed.success === false && parsed.error.issues[0].path).toEqual([
      "breedCode",
    ]);
  });

  it("other인데 breedCustom이 없으면 실패한다", () => {
    const parsed = dogInputSchema.safeParse({ ...base, breedCode: "other" });
    expect(parsed.success).toBe(false);
    expect(parsed.success === false && parsed.error.issues[0].path).toEqual([
      "breedCustom",
    ]);
  });

  it("other이면 breedCustom을 그대로 저장한다", () => {
    const parsed = dogInputSchema.safeParse({
      ...base,
      breedCode: "other",
      breedCustom: "  시고르자브종  ",
    });
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.breedCustom).toBe("시고르자브종");
  });

  it("other가 아니면 breedCustom을 제거한다", () => {
    const parsed = dogInputSchema.safeParse({
      ...base,
      breedCode: "poodle",
      breedCustom: "남아 있으면 안 되는 값",
    });
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.breedCustom).toBeNull();
    expect(parsed.success && parsed.data.breedCode).toBe("poodle");
  });

  it("견종을 비우면 두 값 모두 null이다", () => {
    const parsed = dogInputSchema.safeParse({ ...base, breedCode: "", breedCustom: "" });
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.breedCode).toBeNull();
    expect(parsed.success && parsed.data.breedCustom).toBeNull();
  });

  it("크기는 등록된 값만 받는다", () => {
    expect(dogInputSchema.safeParse({ ...base, size: "HUGE" }).success).toBe(false);
  });
});
