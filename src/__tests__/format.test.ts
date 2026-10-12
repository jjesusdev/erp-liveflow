import { describe, it, expect } from "vitest";
import { money, clock, makeReference } from "@/lib/format";

describe("money", () => {
  it("formats a number with MXN style", () => {
    const result = money(1500);
    expect(result).toContain("1,500.00");
    expect(result).toContain("$");
  });

  it("formats zero", () => {
    expect(money(0)).toContain("0.00");
  });

  it("formats decimals", () => {
    expect(money(99.5)).toContain("99.50");
  });
});

describe("clock", () => {
  it("formats seconds as MM:SS", () => {
    expect(clock(0)).toBe("00:00");
    expect(clock(60)).toBe("01:00");
    expect(clock(90)).toBe("01:30");
    expect(clock(3599)).toBe("59:59");
  });

  it("clamps negative to 0", () => {
    expect(clock(-10)).toBe("00:00");
  });

  it("handles minutes >= 60", () => {
    expect(clock(3600)).toBe("60:00");
  });
});

describe("makeReference", () => {
  it("generates an 8-character alphanumeric reference", () => {
    const ref = makeReference(12345);
    expect(ref).toHaveLength(8);
    expect(ref).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/);
  });

  it("is deterministic for the same seed", () => {
    expect(makeReference(999)).toBe(makeReference(999));
  });

  it("produces different references for different seeds", () => {
    expect(makeReference(1)).not.toBe(makeReference(2));
  });

  it("does not contain ambiguous characters (0, 1, I, O)", () => {
    for (let seed = 0; seed < 100; seed++) {
      const ref = makeReference(seed);
      expect(ref).not.toMatch(/[01IO]/);
    }
  });
});
