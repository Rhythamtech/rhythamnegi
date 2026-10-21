import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';
import { getEnv } from './env';
import { getJwtSecret } from './jwt';

/**
 * Reversible encryption for third-party API keys stored in SQLite.
 *
 * Unlike the CMS login password (one-way scrypt hash), an AI provider key must
 * be sent to the provider in plaintext on every request, so it cannot be hashed.
 * We encrypt it with AES-256-GCM instead:
 *
 *   aes-gcm$<iv base64>$<auth tag base64>$<ciphertext base64>
 *
 * The encryption key is derived (scrypt) from `AI_SECRET` when set, otherwise
 * from the installation's JWT secret. Set AI_SECRET in production so a stolen
 * database file alone is not enough to recover the provider key.
 */

const PREFIX = 'aes-gcm';
const KEY_SALT = 'devfolio:ai-key:v1';
const MIN_SECRET_LENGTH = 32;

let cachedKey: Buffer | null = null;

export function aiEncryptionSecret(): string {
	const dedicated = getEnv('AI_SECRET');
	if (dedicated.length >= MIN_SECRET_LENGTH) return dedicated;
	return getJwtSecret();
}

function encryptionKey(): Buffer {
	if (cachedKey) return cachedKey;
	cachedKey = scryptSync(aiEncryptionSecret(), KEY_SALT, 32);
	return cachedKey;
}

export function isEncryptedSecret(value: string): boolean {
	return value.startsWith(`${PREFIX}$`);
}

export function encryptSecret(plaintext: string): string {
	const iv = randomBytes(12);
	const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
	const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
	const tag = cipher.getAuthTag();
	return `${PREFIX}$${iv.toString('base64')}$${tag.toString('base64')}$${ciphertext.toString('base64')}`;
}

/** Returns null for missing, legacy/plaintext or undecryptable values. */
export function decryptSecret(stored: string): string | null {
	if (!stored || !isEncryptedSecret(stored)) return null;
	try {
		const parts = stored.split('$');
		if (parts.length !== 4) return null;

		const iv = Buffer.from(parts[1], 'base64');
		const tag = Buffer.from(parts[2], 'base64');
		const ciphertext = Buffer.from(parts[3], 'base64');
		if (iv.length === 0 || tag.length === 0 || ciphertext.length === 0) return null;

		const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), iv);
		decipher.setAuthTag(tag);
		return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
	} catch {
		return null;
	}
}
