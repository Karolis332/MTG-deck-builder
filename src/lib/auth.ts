import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'mtg-deck-builder-dev-secret-change-in-prod'
);
const JWT_ISSUER = 'mtg-deck-builder';
const JWT_EXPIRY = '7d';

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  const hashBuffer = Buffer.from(hash, 'hex');
  const testBuffer = scryptSync(password, salt, 64);
  return timingSafeEqual(hashBuffer, testBuffer);
}

export async function createToken(userId: number, username: string): Promise<string> {
  return new SignJWT({ sub: String(userId), username })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(JWT_ISSUER)
    .setExpirationTime(JWT_EXPIRY)
    .sign(JWT_SECRET);
}

export async function verifyToken(
  token: string
): Promise<{ userId: number; username: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, { issuer: JWT_ISSUER });
    return { userId: Number(payload.sub), username: payload.username as string };
  } catch {
    return null;
  }
}
