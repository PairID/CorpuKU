import { describe, expect, it } from "vitest";
import {
  loginSchema,
  parseJsonBody,
  readJsonRequest,
  registerSchema,
  resetPasswordSchema,
  validateNipOrNik,
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

describe("validateNipOrNik", () => {
  it("validates 18-digit NIP ASN correctly", () => {
    const res = validateNipOrNik("19920101 202012 1 001");
    expect(res.valid).toBe(true);
    expect(res.type).toBe("NIP");
    expect(res.clean).toBe("199201012020121001");
    expect(res.metadata?.gender).toBe("Pria");
    expect(res.metadata?.birthDate).toBe("01/01/1992");
  });

  it("validates 16-digit NIK Kependudukan correctly", () => {
    const res = validateNipOrNik("6501020101920001");
    expect(res.valid).toBe(true);
    expect(res.type).toBe("NIK");
    expect(res.clean).toBe("6501020101920001");
  });

  it("rejects input with invalid length (e.g., 17 digits or 15 digits)", () => {
    const res15 = validateNipOrNik("123456789012345");
    expect(res15.valid).toBe(false);
    expect(res15.error).toContain("15 digit");

    const res17 = validateNipOrNik("12345678901234567");
    expect(res17.valid).toBe(false);
    expect(res17.error).toContain("17 digit");
  });

  it("rejects 18-digit NIP with impossible birth date", () => {
    // Month 99
    const res = validateNipOrNik("199299012020121001");
    expect(res.valid).toBe(false);
    expect(res.error).toContain("tanggal lahir");
  });
});

