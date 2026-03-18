import { createHash, randomBytes } from "crypto";
import { compare, hash } from "bcryptjs";

export const PASSWORD_SALT_ROUNDS = 12;
export const PASSWORD_RESET_TOKEN_BYTES = 32;
export const PASSWORD_RESET_TOKEN_TTL_MS =
  Number(process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES ?? 60) * 60 * 1000;

export async function hashPassword(value: string) {
  return hash(value, PASSWORD_SALT_ROUNDS);
}

export async function verifyPassword(value: string, hashedValue: string) {
  return compare(value, hashedValue);
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createPasswordResetToken() {
  const rawToken = randomBytes(PASSWORD_RESET_TOKEN_BYTES).toString("hex");

  return {
    rawToken,
    hashedToken: hashToken(rawToken),
    expiresAt: new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS),
  };
}
