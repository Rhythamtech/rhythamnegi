import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { getEnv } from './env';
import { getSetting, putSetting } from './db';

/**
 * Stateless session tokens (JWT, HS256).
 *
 * Only a signed token is kept client-side (HttpOnly cookie); the server keeps
 * no session table. Tokens carry the username and an expiry and are verified
 * on every CMS request.
 *
 * Signing key: `JWT_SECRET` from the environment when set (recommended for
 * multi-instance deploys), otherwise a random per-installation secret stored in
 * the `settings` table so tokens survive restarts.
 */

const ALG = 'HS256';
const MIN_SECRET_LENGTH = 32;

export type TokenPayload = { sub: string; iat: number; exp: number };

let cachedSecret: string | null = null;

export function getJwtSecret(): string {
	if (cachedSecret) return cachedSecret;

	const fromEnv = getEnv('JWT_SECRET');
	if (fromEnv.length >= MIN_SECRET_LENGTH) {
		cachedSecret = fromEnv;
		return cachedSecret;
	}

	let stored = getSetting('jwt_secret');
	if (!stored || stored.length < MIN_SECRET_LENGTH) {
		stored = randomBytes(48).toString('base64url');
		putSetting('jwt_secret', stored);
	}
	cachedSecret = stored;
	return cachedSecret;
}

export function signSessionToken(
	username: string,
	ttlMs: number
): { token: string; expiresAt: number } {
	const now = Math.floor(Date.now() / 1000);
	const expiresAt = now + Math.max(1, Math.floor(ttlMs / 1000));

	const header = toBase64Url(JSON.stringify({ alg: ALG, typ: 'JWT' }));
	const payload = toBase64Url(JSON.stringify({ sub: username, iat: now, exp: expiresAt } satisfies TokenPayload));
	const signature = sign(`${header}.${payload}`);

	return { token: `${header}.${payload}.${signature}`, expiresAt: expiresAt * 1000 };
}

export function verifySessionToken(token: string): { username: string; expiresAt: number } | null {
	try {
		const parts = token.split('.');
		if (parts.length !== 3) return null;

		const [header, payload, signature] = parts;

		const head = JSON.parse(Buffer.from(header, 'base64url').toString('utf8')) as { alg?: unknown };
		if (head.alg !== ALG) return null;

		const expected = sign(`${header}.${payload}`);
		const received = Buffer.from(signature, 'base64url');
		const wanted = Buffer.from(expected, 'base64url');
		if (received.length !== wanted.length || !timingSafeEqual(received, wanted)) return null;

		const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Partial<TokenPayload>;
		if (typeof data.sub !== 'string' || !data.sub) return null;
		if (typeof data.exp !== 'number' || data.exp * 1000 <= Date.now()) return null;

		return { username: data.sub, expiresAt: data.exp * 1000 };
	} catch {
		return null;
	}
}

function sign(data: string): string {
	return createHmac('sha256', getJwtSecret()).update(data).digest('base64url');
}

function toBase64Url(value: string): string {
	return Buffer.from(value, 'utf8').toString('base64url');
}
