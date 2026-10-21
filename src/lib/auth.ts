import { timingSafeEqual } from 'node:crypto';
import { getAccount, upsertAccount } from './db';
import { hashPassword, validatePassword, validateUsername, verifyPassword } from './password';

/**
 * CMS authentication.
 *
 * The account is stored in SQLite (`cms_account`) with a scrypt password hash.
 * `CMS_USERNAME` / `CMS_PASSWORD` only bootstrap the account on a fresh
 * database; afterwards the database is the source of truth and credentials can
 * be changed from /cms/account without touching the environment.
 *
 * On successful login a random session token is stored in SQLite and sent as an
 * HttpOnly cookie.
 */

export const SESSION_COOKIE = 'cms_session';
export const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export function credentialsConfigured(): boolean {
	return getAccount() !== null;
}

export function checkCredentials(username: string, password: string): boolean {
	const account = getAccount();
	if (!account) return false;

	// Always run both checks so a wrong username costs the same as a wrong password.
	const userOk = safeEqual(username, account.username);
	const passOk = verifyPassword(password, account.password_hash);
	return userOk && passOk;
}

export type CredentialChange =
	| { ok: true; username: string }
	| { ok: false; error: 'config' | 'current' | 'username' | 'password' };

/**
 * Change the username and/or password. The current password is always required.
 * An empty `newPassword` keeps the existing password.
 */
export function changeCredentials(input: {
	currentPassword: string;
	username: string;
	newPassword?: string;
}): CredentialChange {
	const account = getAccount();
	if (!account) return { ok: false, error: 'config' };

	if (!verifyPassword(input.currentPassword, account.password_hash)) {
		return { ok: false, error: 'current' };
	}

	const username = input.username.trim();
	const usernameCheck = validateUsername(username);
	if (!usernameCheck.ok) return { ok: false, error: 'username' };

	let passwordHash = account.password_hash;
	if (input.newPassword) {
		const passwordCheck = validatePassword(input.newPassword, username);
		if (!passwordCheck.ok) return { ok: false, error: 'password' };
		passwordHash = hashPassword(input.newPassword);
	}

	if (username !== account.username || passwordHash !== account.password_hash) {
		upsertAccount(username, passwordHash);
	}

	return { ok: true, username };
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
