#!/usr/bin/env node
/**
 * Reset the CMS username/password directly in SQLite (recovery path).
 *
 * Usage:
 *   npm run cms:reset-password -- <username> <password>
 *   # or, in Docker:
 *   docker compose exec app npm run cms:reset-password -- admin 'new-strong-password'
 *
 * The password is stored as a scrypt hash, matching src/lib/password.ts.
 * Existing JWTs are stateless and stay valid until they expire; clear the
 * `cms_session` cookie or wait for expiry if you need a hard reset.
 */
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, scryptSync } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const username = (process.argv[2] || '').trim();
const password = process.argv[3] || '';

if (!username || !password) {
	console.error('Usage: npm run cms:reset-password -- <username> <password>');
	process.exit(1);
}
if (password.length < 10) {
	console.error('Password must be at least 10 characters.');
	process.exit(1);
}

const configured = process.env.SQLITE_PATH || './data/cms.db';
const file = path.isAbsolute(configured) ? configured : path.join(process.cwd(), configured);

if (!fs.existsSync(file)) {
	console.error(`Database not found: ${file}`);
	process.exit(1);
}

const N = 16384;
const R = 8;
const P = 1;
const salt = randomBytes(16);
const hash = scryptSync(password, salt, 64, { N, r: R, p: P });
const stored = `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${hash.toString('base64')}`;

const db = new DatabaseSync(file);
db.exec('PRAGMA journal_mode = WAL;');
db.exec(`
	CREATE TABLE IF NOT EXISTS cms_account (
		id            INTEGER PRIMARY KEY CHECK (id = 1),
		username      TEXT NOT NULL,
		password_hash TEXT NOT NULL,
		updated_at    TEXT NOT NULL
	);
`);
db.prepare(
	`INSERT INTO cms_account (id, username, password_hash, updated_at)
	 VALUES (1, ?, ?, ?)
	 ON CONFLICT(id) DO UPDATE SET
		username = excluded.username,
		password_hash = excluded.password_hash,
		updated_at = excluded.updated_at`
).run(username, stored, new Date().toISOString());
db.close();

console.log(`CMS credentials updated for "${username}" in ${file}.`);
