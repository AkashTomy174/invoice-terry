import crypto from 'crypto';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { UserRole } from './types';

export const SESSION_COOKIE_NAME = 'terry_session';
export const SESSION_MAX_AGE_SECONDS = 86400 * 7; // 7 days

export interface SessionPayload {
  id: string;
  username: string;
  role: UserRole;
  iat: number; // issued-at, unix seconds
}

function getSecret(): string {
  // Set AUTH_SECRET in production. Falls back to a fixed dev secret so the
  // app still runs out of the box, matching the rest of this project's
  // "works with zero config" approach.
  return process.env.AUTH_SECRET || 'terry-dev-secret-change-me-in-production';
}

function sign(payloadB64: string): string {
  return crypto.createHmac('sha256', getSecret()).update(payloadB64).digest('base64url');
}

/**
 * Build a signed session token: base64url(payload) + "." + hmac-sha256 signature.
 * Unlike the previous plain-JSON cookie, this cannot be forged client-side
 * without knowing AUTH_SECRET.
 */
export function createSessionToken(payload: Omit<SessionPayload, 'iat'>): string {
  const full: SessionPayload = { ...payload, iat: Math.floor(Date.now() / 1000) };
  const payloadB64 = Buffer.from(JSON.stringify(full), 'utf-8').toString('base64url');
  const signature = sign(payloadB64);
  return `${payloadB64}.${signature}`;
}

/**
 * Verify a session token's signature and expiry. Returns the decoded payload
 * if valid, otherwise null. Never throws.
 */
export function verifySessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, signature] = parts;

  let expected: string;
  try {
    expected = sign(payloadB64);
  } catch {
    return null;
  }

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8')) as SessionPayload;
    if (!payload || !payload.id || !payload.role) return null;
    if (typeof payload.iat === 'number' && Date.now() / 1000 - payload.iat > SESSION_MAX_AGE_SECONDS) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

/** For use in Route Handlers / Server Components (reads the Next.js cookie jar). */
export async function getServerSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE_NAME)?.value);
}

/** For use in proxy.ts, where we only have the raw NextRequest. */
export function getSessionFromRequest(request: NextRequest): SessionPayload | null {
  return verifySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);
}

export function isAdmin(session: SessionPayload | null): boolean {
  return !!session && session.role === 'ADMIN';
}
