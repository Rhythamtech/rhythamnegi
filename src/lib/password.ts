import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

/**
 * Password hashing for the CMS account.
 *
 * Uses Node's built-in scrypt (memory-hard, no native dependency). The stored
 * format embeds the parameters and salt so hashes remain verifiable if the
 * defaults change later:
 *
 *   scrypt$<N>$<r>$<p>$<salt base64>$<hash base64>
 *
 * The plaintext password is never persisted — only the hash lives in SQLite.
 */

const N = 16384; // CPU/memory cost (16 MB with r=8)
const R = 8;
const P = 1;
const KEY_LEN = 64;
const SALT_LEN = 16;
const MAX_N = 1 << 20; // refuse absurd cost factors from a tampered row

export const MIN_PASSWORD_LENGTH = 10;
export const MAX_PASSWORD_LENGTH = 200;
export const MIN_USERNAME_LENGTH = 3;
export const MAX_USERNAME_LENGTH = 32;

export function hashPassword(password: string): string {
	const salt = randomBytes(SALT_LEN);
	const hash = scryptSync(password, salt, KEY_LEN, { N, r: R, p: P });
	return `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
	try {
		const parts = stored.split('$');
		if (parts.length !== 6 || parts[0] !== 'scrypt') return false;

		const n = Number.parseInt(parts[1], 10);
		const r = Number.parseInt(parts[2], 10);
		const p = Number.parseInt(parts[3], 10);
		if (!Number.isFinite(n) || !Number.isFinite(r) || !Number.isFinite(p)) return false;
		if (n <= 1 || n > MAX_N || r <= 0 || r > 32 || p <= 0 || p > 16) return false;

		const salt = Buffer.from(parts[4], 'base64');
		const expected = Buffer.from(parts[5], 'base64');
		if (salt.length === 0 || expected.length === 0) return false;

		const actual = scryptSync(password, salt, expected.length, { N: n, r, p });
		return actual.length === expected.length && timingSafeEqual(actual, expected);
	} catch {
		return false;
	}
}

export type Validation = { ok: true } | { ok: false; reason: string };

export function validateUsername(username: string): Validation {
	if (username.length < MIN_USERNAME_LENGTH || username.length > MAX_USERNAME_LENGTH) {
		return {
			ok: false,
			reason: `Username must be ${MIN_USERNAME_LENGTH}–${MAX_USERNAME_LENGTH} characters.`
		};
	}
	if (!/^[A-Za-z0-9._-]+$/.test(username)) {
		return { ok: false, reason: 'Username may only contain letters, numbers, dots, dashes and underscores.' };
	}
	return { ok: true };
}

export function validatePassword(password: string, username = ''): Validation {
	if (password.length < MIN_PASSWORD_LENGTH) {
		return { ok: false, reason: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` };
	}
	if (password.length > MAX_PASSWORD_LENGTH) {
		return { ok: false, reason: `Password must be at most ${MAX_PASSWORD_LENGTH} characters.` };
	}
	if (username && password.toLowerCase().includes(username.toLowerCase())) {
		return { ok: false, reason: 'Password must not contain the username.' };
	}

	const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((re) => re.test(password)).length;
	if (classes < 2) {
		return {
			ok: false,
			reason: 'Password must mix at least two of: lowercase, uppercase, numbers, symbols.'
		};
	}
	return { ok: true };
}
