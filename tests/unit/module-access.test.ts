import { describe, it, expect } from "vitest";
import { evaluateModuleAccess } from "../../src/lib/module-access";

describe("evaluateModuleAccess", () => {
  const now = new Date("2026-11-17T08:00:00.000Z");

  it("allows access by default in manual mode", () => {
    const res = evaluateModuleAccess({}, now);
    expect(res.accessible).toBe(true);
    expect(res.status).toBe("active");
  });

  it("blocks access when manually disabled", () => {
    const res = evaluateModuleAccess({ accessMode: "manual", isActive: false }, now);
    expect(res.accessible).toBe(false);
    expect(res.status).toBe("disabled");
  });

  it("blocks access before scheduled activeFrom", () => {
    const res = evaluateModuleAccess(
      {
        accessMode: "scheduled",
        isActive: false,
        activeFrom: "2026-11-17T09:00:00.000Z",
      },
      now
    );
    expect(res.accessible).toBe(false);
    expect(res.status).toBe("upcoming");
  });

  it("allows access within scheduled window", () => {
    const res = evaluateModuleAccess(
      {
        accessMode: "scheduled",
        activeFrom: "2026-11-17T07:00:00.000Z",
        activeUntil: "2026-11-17T10:00:00.000Z",
      },
      now
    );
    expect(res.accessible).toBe(true);
    expect(res.status).toBe("active");
  });

  it("blocks access after scheduled activeUntil", () => {
    const res = evaluateModuleAccess(
      {
        accessMode: "scheduled",
        activeFrom: "2026-11-17T05:00:00.000Z",
        activeUntil: "2026-11-17T07:30:00.000Z",
      },
      now
    );
    expect(res.accessible).toBe(false);
    expect(res.status).toBe("expired");
  });
});
