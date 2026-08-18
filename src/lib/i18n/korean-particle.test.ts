import { describe, expect, it } from "vitest";

import {
  comitativeParticle,
  hasFinalConsonant,
  objectParticle,
} from "@/lib/i18n/korean-particle";

describe("hasFinalConsonant", () => {
  it("받침이 있는 글자로 끝나면 true", () => {
    expect(hasFinalConsonant("검증견")).toBe(true);
    expect(hasFinalConsonant("몽실")).toBe(true);
  });

  it("받침이 없는 글자로 끝나면 false", () => {
    expect(hasFinalConsonant("별이")).toBe(false);
    expect(hasFinalConsonant("초코")).toBe(false);
  });

  it("한글이 아니면 판단하지 않는다", () => {
    expect(hasFinalConsonant("Coco")).toBeNull();
    expect(hasFinalConsonant("7")).toBeNull();
    expect(hasFinalConsonant("")).toBeNull();
    expect(hasFinalConsonant("   ")).toBeNull();
  });

  it("앞뒤 공백은 무시한다", () => {
    expect(hasFinalConsonant("  검증견  ")).toBe(true);
    expect(hasFinalConsonant("  별이  ")).toBe(false);
  });
});

describe("objectParticle", () => {
  it("받침 여부에 따라 을/를을 고른다", () => {
    expect(`별이${objectParticle("별이")}`).toBe("별이를");
    expect(`검증견${objectParticle("검증견")}`).toBe("검증견을");
    expect(`몽이${objectParticle("몽이")}`).toBe("몽이를");
    expect(`초코${objectParticle("초코")}`).toBe("초코를");
  });

  it("판단할 수 없으면 받침 없는 형태로 떨어진다", () => {
    expect(objectParticle("Coco")).toBe("를");
    expect(objectParticle("7")).toBe("를");
    expect(objectParticle("")).toBe("를");
  });
});

describe("comitativeParticle", () => {
  it("받침 여부에 따라 와/과를 고른다", () => {
    expect(`별이${comitativeParticle("별이")}`).toBe("별이와");
    expect(`검증견${comitativeParticle("검증견")}`).toBe("검증견과");
  });

  it("판단할 수 없으면 받침 없는 형태로 떨어진다", () => {
    expect(comitativeParticle("Coco")).toBe("와");
    expect(comitativeParticle("")).toBe("와");
  });
});
