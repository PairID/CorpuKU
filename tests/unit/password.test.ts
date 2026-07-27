import { describe, expect, it } from "vitest";
import {
  generateTemporaryPassword,
  hashPassword,
  isPasswordHash,
  validatePasswordStrength,
  verifyPassword,
} from "../../src/lib/password";

describe("password security", () => {
  it("enforces the production password policy", () => {
    expect(validatePasswordStrength("short")).toContain("minimal");
    expect(validatePasswordStrength("alllowercase1")).toContain("huruf besar");
    expect(validatePasswordStrength("StrongPass9")).toBeNull();
  });

  it("hashes and verifies a password without storing the secret", async () => {
    const password = "ProductionPass9";
    const hash = await hashPassword(password);

    expect(hash).not.toContain(password);
    expect(isPasswordHash(hash)).toBe(true);
    await expect(verifyPassword(password, hash)).resolves.toEqual({ valid: true, needsRehash: false });
    await expect(verifyPassword("WrongPassword9", hash)).resolves.toEqual({ valid: false, needsRehash: false });
  });

  it("accepts a matching legacy value only to trigger an immediate rehash", async () => {
    await expect(verifyPassword("LegacyPass9", "LegacyPass9")).resolves.toEqual({
      valid: true,
      needsRehash: true,
    });
  });

  it("fails closed for malformed hashes", async () => {
    await expect(verifyPassword("ProductionPass9", "scrypt$broken")).resolves.toEqual({
      valid: false,
      needsRehash: false,
    });
  });

  it("generates temporary credentials that satisfy the same policy", () => {
    const temporaryPassword = generateTemporaryPassword();
    expect(validatePasswordStrength(temporaryPassword)).toBeNull();
    expect(temporaryPassword.length).toBeGreaterThanOrEqual(10);
  });
});
