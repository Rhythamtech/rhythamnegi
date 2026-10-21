import type { APIContext } from 'astro';
import { SESSION_COOKIE, SESSION_DURATION_MS } from './auth';
import { signSessionToken, verifySessionToken } from './jwt';

/**
 * JWT session helpers used by middleware and CMS endpoints.
 *
 * The browser holds a signed, HttpOnly token; there is no server-side session
 * table. Logout simply clears the cookie, and tokens remain valid until they
 * expire even if the password is changed (by design — stateless sessions).
 */

export type SessionInfo = { username: string; expiresAt: number };

export function getSessionFromContext(context: APIContext): SessionInfo | null {
	const token = context.cookies.get(SESSION_COOKIE)?.value;
	return token ? verifySessionToken(token) : null;
}

export function isCmsAuthed(context: APIContext): boolean {
	return getSessionFromContext(context) !== null;
}

export function startSession(context: APIContext, username: string): void {
	const { token, expiresAt } = signSessionToken(username, SESSION_DURATION_MS);
	context.cookies.set(SESSION_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: isHttps(context),
		maxAge: Math.floor((expiresAt - Date.now()) / 1000)
	});
}

export function endSession(context: APIContext): void {
	context.cookies.delete(SESSION_COOKIE, { path: '/' });
}

function isHttps(context: APIContext): boolean {
	const proto = context.request.headers.get('x-forwarded-proto');
	if (proto) {
		const first = proto.split(',')[0].trim().toLowerCase();
		if (first === 'https') return true;
	}
	try {
		return new URL(context.url.toString()).protocol === 'https:';
	} catch {
		return false;
	}
}

/* ------------------------------- rate limit ------------------------------- */

const WINDOW_MS = 10 * 60 * 1000;
const MAX_FAILS_PER_WINDOW = 10;
const failures = new Map<string, { count: number; until: number }>();

export function clientIsRateLimited(ip: string): boolean {
	const entry = failures.get(ip);
	if (!entry) return false;
	if (entry.until > Date.now()) return true;
	failures.delete(ip);
	return false;
}

export function noteLoginFailure(ip: string): void {
	const entry = failures.get(ip) ?? { count: 0, until: 0 };
	entry.count += 1;
	if (entry.count >= MAX_FAILS_PER_WINDOW) {
		entry.until = Date.now() + WINDOW_MS;
	}
	failures.set(ip, entry);
}

export function resetLoginFailures(ip: string): void {
	failures.delete(ip);
}
