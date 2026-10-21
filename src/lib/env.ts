import fs from 'node:fs';
import path from 'node:path';

/**
 * Runtime environment loader.
 *
 * Astro/Vite bakes `.env` values into the client build only; the standalone
 * server (`dist/server/entry.mjs`) would otherwise not see them. This merges
 * `process.env` with a `.env` file from the working directory so the same
 * code works in `astro dev`, in Docker, and behind a reverse proxy.
 *
 * Real environment variables always win over file values.
 */

const globalKey = '__devolio_env__';

function parseEnvFile(filePath: string): Record<string, string> {
	const result: Record<string, string> = {};
	let raw = '';
	try {
		raw = fs.readFileSync(filePath, 'utf8');
	} catch {
		return result;
	}
	for (const line of raw.split(/\r?\n/)) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) continue;
		const eq = trimmed.indexOf('=');
		if (eq <= 0) continue;
		const key = trimmed.slice(0, eq).trim();
		let value = trimmed.slice(eq + 1).trim();
		if (
			(value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
			(value.startsWith("'") && value.endsWith("'") && value.length >= 2)
		) {
			value = value.slice(1, -1);
		}
		if (key && !(key in result)) {
			result[key] = value;
		}
	}
	return result;
}

function build(): Record<string, string> {
	const merged: Record<string, string> = {};
	for (const [key, value] of Object.entries(process.env)) {
		if (typeof value === 'string') {
			merged[key] = value;
		}
	}
	// Prefer `.env` first so real env vars keep priority.
	for (const [key, value] of Object.entries(parseEnvFile(path.join(process.cwd(), '.env')))) {
		if (!(key in merged)) merged[key] = value;
	}
	for (const [key, value] of Object.entries(parseEnvFile(path.join(process.cwd(), '.env.production')))) {
		if (!(key in merged)) merged[key] = value;
	}
	return merged;
}

export function getEnv(key: string, fallback = ''): string {
	const store: Record<string, string> =
		((globalThis as any)[globalKey] ??= build());
	const value = store[key];
	return value === undefined || value === '' ? fallback : value;
}

export function siteOrigin(defaultOrigin = 'http://localhost:4321'): string {
	try {
		return new URL(getEnv('SITE', defaultOrigin)).origin;
	} catch {
		return defaultOrigin;
	}
}

export function siteHost(): string {
	try {
		return new URL(siteOrigin()).host;
	} catch {
		return 'localhost:4321';
	}
}
