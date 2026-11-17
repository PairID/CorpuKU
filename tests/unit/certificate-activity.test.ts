import { describe, it, expect } from "vitest";
import { formatActivityDateRange, formatDeliveryPhrase } from "../../src/lib/certificate-activity";

describe("certificate activity formatting", () => {
  it("formats same-month date range cleanly", () => {
    expect(formatActivityDateRange("2026-11-17", "2026-11-19")).toBe("17 - 19 November 2026");
  });

  it("formats single-day activity without range", () => {
    expect(formatActivityDateRange("2026-11-17", "2026-11-17")).toBe("17 November 2026");
    expect(formatActivityDateRange("2026-11-17", null)).toBe("17 November 2026");
  });

  it("formats cross-month date range cleanly", () => {
    expect(formatActivityDateRange("2026-11-28", "2026-12-02")).toBe("28 November - 2 Desember 2026");
  });

  it("formats delivery mode and location phrases", () => {
    expect(formatDeliveryPhrase("daring", "Kota Tarakan")).toBe("secara daring");
    expect(formatDeliveryPhrase("luring", "Kota Tarakan")).toBe("secara klasikal di Kota Tarakan");
    expect(formatDeliveryPhrase("blended", "Kota Tarakan")).toBe("secara blended learning di Kota Tarakan");
  });
});
