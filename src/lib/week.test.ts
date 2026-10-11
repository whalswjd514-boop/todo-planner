import { describe, expect, it } from "vitest";
import { addWeeks, isWeekStart, weekStartOf } from "./week";

describe("weekStartOf", () => {
  it("returns Monday for a Monday", () => expect(weekStartOf(new Date(2026, 9, 5))).toBe("2026-10-05"));
  it("returns previous Monday for a Sunday", () => expect(weekStartOf(new Date(2026, 9, 11))).toBe("2026-10-05"));
  it("crosses a month boundary", () => expect(weekStartOf(new Date(2026, 10, 1))).toBe("2026-10-26"));
  it("crosses a year boundary", () => expect(weekStartOf(new Date(2027, 0, 1))).toBe("2026-12-28"));
});

describe("isWeekStart", () => {
  it("accepts Mondays only", () => {
    expect(isWeekStart("2026-10-05")).toBe(true);
    expect(isWeekStart("2026-10-06")).toBe(false);
    expect(isWeekStart("2026-02-30")).toBe(false);
    expect(isWeekStart("bad")).toBe(false);
  });
});

describe("addWeeks", () => {
  it("moves by whole weeks", () => {
    expect(addWeeks("2026-10-05", 1)).toBe("2026-10-12");
    expect(addWeeks("2026-10-05", -1)).toBe("2026-09-28");
  });
});
