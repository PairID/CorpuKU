import { describe, expect, it } from "vitest";
import {
  loginSchema,
  parseJsonBody,
  readJsonRequest,
  registerSchema,
  resetPasswordSchema,
} from "../../src/lib/validation";

describe("authentication input validation", () => {
  it("normalizes registration fields", () => {
    const value = registerSchema.parse({
      name: "  Peserta Uji  ",
      email: "  TEST@EXAMPLE.COM ",
      password: "ProductionPass9",
    });

    expect(value.name).toBe("Peserta Uji");
    expect(value.email).toBe("test@example.com");
    expect(value.nip).toBe("");
    expect(value.instansiAsal).toBe("Umum");
  });

  it("rejects unexpected registration properties", () => {
    expect(registerSchema.safeParse({
      name: "Peserta Uji",
      email: "test@example.com",
      password: "ProductionPass9",
      role: "admin",
    }).success).toBe(false);
  });

  it("rejects malformed reset tokens", () => {
    expect(resetPasswordSchema.safeParse({ token: "too-short", password: "ProductionPass9" }).success).toBe(false);
    expect(resetPasswordSchema.safeParse({ token: "a".repeat(43), password: "ProductionPass9" }).success).toBe(true);
  });

  it("returns null instead of partially accepting invalid JSON", () => {
    expect(parseJsonBody(loginSchema, { username: "", password: "secret", extra: true })).toBeNull();
    expect(parseJsonBody(loginSchema, { username: "peserta", password: "secret" })).toEqual({
      username: "peserta",
      password: "secret",
    });
  });

  it("accepts only bounded JSON request bodies", async () => {
    const valid = new Request("https://example.test/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "peserta", password: "secret" }),
    });
    await expect(readJsonRequest(valid)).resolves.toEqual({ username: "peserta", password: "secret" });

    const wrongType = new Request("https://example.test/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: "{}",
    });
    await expect(readJsonRequest(wrongType)).resolves.toBeNull();

    const oversized = new Request("https://example.test/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": "99999" },
      body: "{}",
    });
    await expect(readJsonRequest(oversized, 100)).resolves.toBeNull();
  });
});
