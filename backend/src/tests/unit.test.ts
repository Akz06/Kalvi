import { describe, expect, it } from "vitest";
import { toMinor, toMajor, moneyToMajor, MONEY_FIELDS } from "../shared/money.js";
import { computeGrade, parseFeatures, DEFAULT_FEATURES } from "../shared/config.js";

describe("money helpers (unit)", () => {
  it("converts major → minor without float drift", () => {
    expect(toMinor(100.5)).toBe(10050);
    expect(toMinor(0.1)).toBe(10);
    expect(toMinor(0)).toBe(0);
  });

  it("converts minor → major", () => {
    expect(toMajor(10050)).toBe(100.5);
    expect(toMajor(0)).toBe(0);
  });

  it("round-trips a tricky value exactly (no 0.1+0.2 drift)", () => {
    const minor = toMinor(0.1) + toMinor(0.2);
    expect(minor).toBe(30);
    expect(toMajor(minor)).toBe(0.3);
  });

  it("recursively converts only money fields to major units", () => {
    const record = {
      amount: 10000,
      amountPaid: 4000,
      title: "Term 1",
      items: [{ amount: 6000, defaultAmount: 6000, feeHeadId: "x" }],
    };
    const out = moneyToMajor(record, MONEY_FIELDS);
    expect(out.amount).toBe(100);
    expect(out.amountPaid).toBe(40);
    expect(out.title).toBe("Term 1");
    expect(out.items[0].amount).toBe(60);
    expect(out.items[0].defaultAmount).toBe(60);
    expect(out.items[0].feeHeadId).toBe("x");
  });
});

describe("grade computation (unit)", () => {
  it("maps percentages to the expected grade bands", () => {
    expect(computeGrade(95, 100).grade).toBe("A+");
    expect(computeGrade(85, 100).grade).toBe("A");
    expect(computeGrade(50, 100).grade).toBe("C");
    expect(computeGrade(10, 100).grade).toBe("F");
  });

  it("handles a zero max gracefully", () => {
    const r = computeGrade(0, 0);
    expect(r.percentage).toBe(0);
    expect(r.grade).toBe("F");
  });
});

describe("feature flags (unit)", () => {
  it("returns defaults for empty / invalid JSON", () => {
    expect(parseFeatures("")).toEqual(DEFAULT_FEATURES);
    expect(parseFeatures("not-json")).toEqual(DEFAULT_FEATURES);
    expect(parseFeatures(null)).toEqual(DEFAULT_FEATURES);
  });

  it("merges stored overrides over the defaults", () => {
    const merged = parseFeatures(JSON.stringify({ parentPortal: true, exams: false }));
    expect(merged.parentPortal).toBe(true);
    expect(merged.exams).toBe(false);
    expect(merged.students).toBe(true); // untouched default
  });
});
