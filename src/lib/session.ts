import type { APIContext } from 'astro';
import { SESSION_COOKIE, SESSION_DURATION_MS, checkCredentials } from './auth';
import {
	createSession,
	deleteSession,
	getValidSession,
	pruneSessions
} from './db';

/**
 * Session helpers used by middleware and CMS endpoints.
 *
 * Session state lives in SQLite (see `sessions` table); the browser only
 * receives an opaque random token in an HttpOnly cookie.
 */

export type SessionInfo = { username: string; expiresAt: number };

export function getSessionFromContext(context: APIContext): SessionInfo | null {
	const token = context.cookies.get(SESSION_COOKIE)?.value;
	return token ? toSessionInfo(getValidSession(token)) : null;
}

export function isCmsAuthed(context: APIContext): boolean {
	return getSessionFromContext(context) !== null;
}

export function startSession(context: APIContext, username: string): void {
	pruneSessions();
	const { token, expiresAt } = createSession(username, SESSION_DURATION_MS);
	context.cookies.set(SESSION_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: isHttps(context),
		maxAge: Math.floor(SESSION_DURATION_MS / 1000)
	});
}

export function endSession(context: APIContext): void {
	const token = context.cookies.get(SESSION_COOKIE)?.value;
	if (token) deleteSession(token);
	context.cookies.delete(SESSION_COOKIE, { path: '/' });
}

function toSessionInfo(row: { username: string; expiresAt: number } | null): SessionInfo | null {
	if (!row) return null;
	return { username: row.username, expiresAt: row.expiresAt };
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

export { SESSION_COOKIE, checkCredentials };
