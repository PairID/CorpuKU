import crypto from "crypto";
const KEY_LENGTH = 64;
const SCRYPT_COST = 16_384;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;
const PASSWORD_PREFIX = "scrypt";

function deriveKey(password: string, salt: string, options: crypto.ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, KEY_LENGTH, options, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

export function isPasswordHash(value: string): boolean {
  return value.startsWith(`${PASSWORD_PREFIX}$`);
}

export function validatePasswordStrength(password: string): string | null {
  if (password.length < 10) return "Password minimal 10 karakter.";
  if (password.length > 128) return "Password maksimal 128 karakter.";
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    return "Password harus mengandung huruf besar, huruf kecil, dan angka.";
  }
  return null;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("base64url");
  const derivedKey = await deriveKey(password, salt, {
    N: SCRYPT_COST,
    r: SCRYPT_BLOCK_SIZE,
    p: SCRYPT_PARALLELIZATION,
  });

  return [
    PASSWORD_PREFIX,
    SCRYPT_COST,
    SCRYPT_BLOCK_SIZE,
    SCRYPT_PARALLELIZATION,
    salt,
    derivedKey.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(
  password: string,
  storedPassword: string,
): Promise<{ valid: boolean; needsRehash: boolean }> {
  if (!isPasswordHash(storedPassword)) {
    const supplied = Buffer.from(password);
    const stored = Buffer.from(storedPassword);
    const valid = supplied.length === stored.length && crypto.timingSafeEqual(supplied, stored);
    return { valid, needsRehash: valid };
  }

  const [prefix, costValue, blockSizeValue, parallelizationValue, salt, expectedValue] = storedPassword.split("$");
  if (prefix !== PASSWORD_PREFIX || !salt || !expectedValue) {
    return { valid: false, needsRehash: false };
  }

  const cost = Number(costValue);
  const blockSize = Number(blockSizeValue);
  const parallelization = Number(parallelizationValue);
  if (![cost, blockSize, parallelization].every(Number.isSafeInteger)) {
    return { valid: false, needsRehash: false };
  }

  try {
    const actual = await deriveKey(password, salt, {
      N: cost,
      r: blockSize,
      p: parallelization,
    });
    const expected = Buffer.from(expectedValue, "base64url");
    const valid = actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
    return {
      valid,
      needsRehash:
        valid &&
        (cost !== SCRYPT_COST ||
          blockSize !== SCRYPT_BLOCK_SIZE ||
          parallelization !== SCRYPT_PARALLELIZATION),
    };
  } catch {
    return { valid: false, needsRehash: false };
  }
}

export function generateTemporaryPassword(): string {
  const random = crypto.randomBytes(12).toString("base64url");
  return `Ck9${random}aA`;
}
