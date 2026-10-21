import { timingSafeEqual } from 'node:crypto';
import { getEnv } from './env';

/**
 * CMS authentication.
 *
 * Initial login credentials come from the environment (`CMS_USERNAME` /
 * `CMS_PASSWORD`, see `.env.example`). On successful login a random session
 * token is stored in SQLite and sent as an HttpOnly cookie.
 */

export const SESSION_COOKIE = 'cms_session';
export const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export function credentialsConfigured(): boolean {
	return !!getEnv('CMS_USERNAME') && !!getEnv('CMS_PASSWORD');
}

export function verifyCredentials(username: string, password: string): boolean {
	const envUser = getEnv('CMS_USERNAME');
	const envPass = getEnv('CMS_PASSWORD');
	if (!envUser || !envPass) {
		throw new Error(
			'CMS credentials are not configured. Set CMS_USERNAME and CMS_PASSWORD in your .env file (see .env.example).'
		);
	}
	return safeEqual(username, envUser) && safeEqual(password, envPass);
}

function safeEqual(a: string, b: string): boolean {
	const bufA = Buffer.from(a, 'utf8');
	const bufB = Buffer.from(b, 'utf8');
	if (bufA.length !== bufB.length) {
		// Consume the same amount of work so timing stays roughly constant.
		timingSafeEqual(bufA, bufA);
		return false;
	}
	return timingSafeEqual(bufA, bufB);
}

export function checkCredentials(username: string, password: string): boolean {
	return verifyCredentials(username, password);
}
