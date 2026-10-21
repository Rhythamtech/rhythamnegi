import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { getEnv } from './env';
import { hashPassword } from './password';

/**
 * SQLite layer for the whole site (content + profile + media + auth).
 *
 * Uses Node's built-in `node:sqlite` driver (no native dependency needed).
 * All public data lives here — markdown content, uploaded image blobs,
 * site settings and CMS sessions.
 */

let _db: DatabaseSync | null = null;

export function dbFile(): string {
	const configured = getEnv('SQLITE_PATH', './data/cms.db');
	return path.isAbsolute(configured) ? configured : path.join(process.cwd(), configured);
}

export function getDb(): DatabaseSync {
	if (_db) return _db;
	const file = dbFile();
	fs.mkdirSync(path.dirname(file), { recursive: true });
	_db = new DatabaseSync(file);
	_db.exec('PRAGMA journal_mode = WAL;');
	_db.exec('PRAGMA foreign_keys = ON;');
	initSchema(_db);
	seedDefaults(_db);
	return _db;
}

function initSchema(db: DatabaseSync) {
	db.exec(`
		CREATE TABLE IF NOT EXISTS settings (
			key   TEXT PRIMARY KEY,
			value TEXT NOT NULL DEFAULT ''
		);

		CREATE TABLE IF NOT EXISTS profile (
			id              INTEGER PRIMARY KEY CHECK (id = 1),
			name            TEXT NOT NULL DEFAULT '',
			role            TEXT NOT NULL DEFAULT '',
			bio_md          TEXT NOT NULL DEFAULT '',
			avatar_media_id INTEGER,
			banner_media_id INTEGER
		);

		CREATE TABLE IF NOT EXISTS posts (
			id             INTEGER PRIMARY KEY AUTOINCREMENT,
			slug           TEXT NOT NULL UNIQUE,
			title          TEXT NOT NULL,
			seo_title      TEXT,
			description    TEXT NOT NULL DEFAULT '',
			body_md        TEXT NOT NULL DEFAULT '',
			tags           TEXT NOT NULL DEFAULT '[]',
			cover_media_id INTEGER,
			pub_date       TEXT,
			updated_date   TEXT,
			status         TEXT NOT NULL DEFAULT 'draft',
			created_at     TEXT NOT NULL,
			updated_at     TEXT NOT NULL
		);

		CREATE TABLE IF NOT EXISTS projects (
			id             INTEGER PRIMARY KEY AUTOINCREMENT,
			slug           TEXT NOT NULL UNIQUE,
			title          TEXT NOT NULL,
			description    TEXT NOT NULL DEFAULT '',
			repo_url       TEXT,
			demo_url       TEXT,
			tags           TEXT NOT NULL DEFAULT '[]',
			cover_media_id INTEGER,
			pub_date       TEXT,
			status         TEXT NOT NULL DEFAULT 'draft',
			created_at     TEXT NOT NULL,
			updated_at     TEXT NOT NULL
		);

		CREATE TABLE IF NOT EXISTS media (
			id         INTEGER PRIMARY KEY AUTOINCREMENT,
			filename   TEXT NOT NULL,
			mime       TEXT NOT NULL,
			width      INTEGER,
			height     INTEGER,
			size       INTEGER,
			hash       TEXT NOT NULL,
			alt        TEXT NOT NULL DEFAULT '',
			data       BLOB NOT NULL,
			created_at TEXT NOT NULL
		);

		CREATE TABLE IF NOT EXISTS about_experience (
			id      INTEGER PRIMARY KEY AUTOINCREMENT,
			company TEXT NOT NULL,
			role    TEXT NOT NULL,
			period  TEXT NOT NULL,
			bullets TEXT NOT NULL DEFAULT '',
			ord     INTEGER NOT NULL DEFAULT 0
		);

		CREATE TABLE IF NOT EXISTS about_skills (
			id      INTEGER PRIMARY KEY AUTOINCREMENT,
			heading TEXT NOT NULL,
			items   TEXT NOT NULL DEFAULT '',
			ord     INTEGER NOT NULL DEFAULT 0
		);

		CREATE TABLE IF NOT EXISTS about_education (
			id      INTEGER PRIMARY KEY AUTOINCREMENT,
			title   TEXT NOT NULL,
			ord     INTEGER NOT NULL DEFAULT 0
		);

		-- Single CMS account. Passwords are stored as scrypt hashes, never plaintext.
		CREATE TABLE IF NOT EXISTS cms_account (
			id            INTEGER PRIMARY KEY CHECK (id = 1),
			username      TEXT NOT NULL,
			password_hash TEXT NOT NULL,
			updated_at    TEXT NOT NULL
		);
	`);
}

const DEFAULT_SETTINGS: Record<string, string> = {
	site_title: 'Rhytham Negi',
	site_tagline: 'Innovative AI Engineer',
	site_description:
		'Innovative AI Engineer with 4 years of experience enhancing media products through advanced AI technologies.',
	hero_intro:
		"I'm Rhytham Negi, an AI Engineer with 4 years of experience enhancing media products through advanced AI technologies. I specialize in building NLP workflows, RAG pipelines, and multi-modal AI features.\n\nAutomated business insights led to streamlined decision-making and efficiency gains. Feel free to explore my projects and read my latest thoughts on the blog.",
	about_intro:
		"I'm an Innovative AI Engineer with 4 years of experience enhancing media products through advanced AI technologies. My expertise lies in automating business insights, which has led to streamlined decision-making and significant efficiency gains.",
	github_url: 'https://github.com/Rhythamtech',
	linkedin_url: 'https://linkedin.com/in/rhythamnegi'
};

function seedDefaults(db: DatabaseSync) {
	const settingsCount = (db.prepare('SELECT COUNT(*) AS c FROM settings').get() as any).c as number;
	if (settingsCount === 0) {
		for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
			db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run(key, value);
		}
	}
	const profileCount = (db.prepare('SELECT COUNT(*) AS c FROM profile').get() as any).c as number;
	if (profileCount === 0) {
		db.prepare(
			'INSERT INTO profile (id, name, role, bio_md) VALUES (1, ?, ?, ?)'
		).run(DEFAULT_SETTINGS.site_title, DEFAULT_SETTINGS.site_tagline, '');
	}

	// First boot on a fresh database: import the bootstrap credentials from the
	// environment and store only their scrypt hash. After this, the database is
	// the source of truth and credentials are managed from the CMS.
	const accountCount = (db.prepare('SELECT COUNT(*) AS c FROM cms_account').get() as any).c as number;
	if (accountCount === 0) {
		const user = getEnv('CMS_USERNAME');
		const pass = getEnv('CMS_PASSWORD');
		if (user && pass) {
			db.prepare(
				'INSERT INTO cms_account (id, username, password_hash, updated_at) VALUES (1, ?, ?, ?)'
			).run(user, hashPassword(pass), new Date().toISOString());
		}
	}
}

/* ---------------------------------- utils --------------------------------- */

const now = () => new Date().toISOString();
export const parseTags = (value: string): string[] => {
	try {
		const parsed = JSON.parse(value || '[]');
		return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
	} catch {
		return [];
	}
};
const toDate = (raw: string | null | undefined): Date | null => (raw ? new Date(raw) : null);
export type PostStatus = 'draft' | 'published';
export type MediaRow = {
	id: number;
	filename: string;
	mime: string;
	width: number | null;
	height: number | null;
	size: number | null;
	hash: string;
	alt: string;
	data: Uint8Array;
	created_at: string;
};

/* --------------------------------- posts ---------------------------------- */

export type PostRow = {
	id: number;
	slug: string;
	title: string;
	seo_title: string | null;
	description: string;
	body_md: string;
	tags: string;
	cover_media_id: number | null;
	pub_date: string | null;
	updated_date: string | null;
	status: string;
	created_at: string;
	updated_at: string;
};

export type Post = Omit<PostRow, 'tags' | 'pub_date' | 'updated_date'> & {
	tags: string[];
	pubDate: Date | null;
	updatedDate: Date | null;
	coverUrl: string | null;
};

const mapPost = (row: PostRow): Post => ({
	...row,
	tags: parseTags(row.tags),
	pubDate: toDate(row.pub_date),
	updatedDate: toDate(row.updated_date),
	coverUrl: row.cover_media_id ? `/media/${row.cover_media_id}` : null
});

export function listPosts(opts: { publishedOnly?: boolean; tag?: string } = {}): Post[] {
	let rows: PostRow[];
	if (opts.publishedOnly) {
		rows = getDb()
			.prepare(
				'SELECT * FROM posts WHERE status = \'published\' ORDER BY pub_date IS NULL, pub_date DESC, id DESC'
			)
			.all() as PostRow[];
	} else {
		rows = getDb()
			.prepare("SELECT * FROM posts ORDER BY status, pub_date IS NULL, pub_date DESC, id DESC")
			.all() as PostRow[];
	}
	let posts = rows.map(mapPost);
	if (opts.tag) {
		const tag = opts.tag;
		posts = posts.filter((p) => p.tags.some((t) => t.toLowerCase() === tag.toLowerCase()));
	}
	return posts;
}

/**
 * All tags currently used in the system, deduped case-insensitively.
 * Ordered by usage count (most used first), keeping the most common casing.
 */
export function listExistingTags(limit = 40): string[] {
	const rows = getDb()
		.prepare('SELECT tags FROM posts WHERE tags IS NOT NULL')
		.all() as Array<{ tags: string }>;
	const casing = new Map<string, string>(); // lowercase -> first-seen display casing
	const counts = new Map<string, number>();
	for (const row of rows) {
		for (const tag of parseTags(row.tags)) {
			const key = tag.toLowerCase();
			if (!key) continue;
			if (!casing.has(key)) casing.set(key, tag);
			counts.set(key, (counts.get(key) || 0) + 1);
		}
	}
	return [...counts.entries()]
		.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
		.slice(0, limit)
		.map(([key]) => casing.get(key) || key);
}

export function getPostBySlug(slug: string, publishedOnly = true): Post | null {
	const sql = publishedOnly
		? "SELECT * FROM posts WHERE slug = ? AND status = 'published' LIMIT 1"
		: 'SELECT * FROM posts WHERE slug = ? LIMIT 1';
	const row = getDb().prepare(sql).get(slug) as PostRow | undefined;
	return row ? mapPost(row) : null;
}

export function getPostById(id: number): Post | null {
	const row = getDb().prepare('SELECT * FROM posts WHERE id = ? LIMIT 1').get(id) as PostRow | undefined;
	return row ? mapPost(row) : null;
}

export function slugExistsNotSelf(table: 'posts' | 'projects', slug: string, selfId: number | null): boolean {
	const row = getDb()
		.prepare(`SELECT id FROM ${table} WHERE slug = ? LIMIT 1`)
		.get(slug) as { id: number } | undefined;
	return !!row && row.id !== selfId;
}

export function uniqueSlug(table: 'posts' | 'projects', base: string, selfId: number | null): string {
	let candidate = base;
	let n = 2;
	while (slugExistsNotSelf(table, candidate, selfId)) {
		candidate = `${base}-${n++}`;
	}
	return candidate;
}

export type PostInput = {
	slug: string;
	title: string;
	seo_title: string | null;
	description: string;
	body_md: string;
	tags: string[];
	cover_media_id: number | null;
	pub_date: string | null;
	updated_date: string | null;
	status: PostStatus;
};

export function createPost(input: PostInput): Post {
	const ts = now();
	const res = getDb()
		.prepare(
			`INSERT INTO posts
				(slug, title, seo_title, description, body_md, tags, cover_media_id, pub_date, updated_date, status, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
		)
		.run(
			input.slug, input.title, input.seo_title, input.description, input.body_md,
			JSON.stringify(input.tags), input.cover_media_id, input.pub_date, input.updated_date,
			input.status, ts, ts
		);
	return getPostById(Number(res.lastInsertRowid))!;
}

export function updatePost(id: number, input: PostInput): Post {
	getDb()
		.prepare(
			`UPDATE posts SET
				slug = ?, title = ?, seo_title = ?, description = ?, body_md = ?, tags = ?,
				cover_media_id = ?, pub_date = ?, updated_date = ?, status = ?, updated_at = ?
			 WHERE id = ?`
		)
		.run(
			input.slug, input.title, input.seo_title, input.description, input.body_md,
			JSON.stringify(input.tags), input.cover_media_id, input.pub_date, input.updated_date,
			input.status, now(), id
		);
	return getPostById(id)!;
}

export function deletePost(id: number): void {
	getDb().prepare('DELETE FROM posts WHERE id = ?').run(id);
}

/* -------------------------------- projects -------------------------------- */

export type ProjectRow = {
	id: number;
	slug: string;
	title: string;
	description: string;
	repo_url: string | null;
	demo_url: string | null;
	tags: string;
	cover_media_id: number | null;
	pub_date: string | null;
	status: string;
	created_at: string;
	updated_at: string;
};

export type Project = Omit<ProjectRow, 'tags' | 'pub_date'> & {
	tags: string[];
	pubDate: Date | null;
	coverUrl: string | null;
};

const mapProject = (row: ProjectRow): Project => ({
	...row,
	tags: parseTags(row.tags),
	pubDate: toDate(row.pub_date),
	coverUrl: row.cover_media_id ? `/media/${row.cover_media_id}` : null
});

export function listProjects(opts: { publishedOnly?: boolean } = {}): Project[] {
	const sql = opts.publishedOnly
		? "SELECT * FROM projects WHERE status = 'published' ORDER BY pub_date IS NULL, pub_date DESC, id DESC"
		: 'SELECT * FROM projects ORDER BY status, pub_date IS NULL, pub_date DESC, id DESC';
	return (getDb().prepare(sql).all() as ProjectRow[]).map(mapProject);
}

export function getProjectById(id: number): Project | null {
	const row = getDb().prepare('SELECT * FROM projects WHERE id = ? LIMIT 1').get(id) as ProjectRow | undefined;
	return row ? mapProject(row) : null;
}

export type ProjectInput = {
	slug: string;
	title: string;
	description: string;
	repo_url: string | null;
	demo_url: string | null;
	tags: string[];
	cover_media_id: number | null;
	pub_date: string | null;
	status: PostStatus;
};

export function createProject(input: ProjectInput): Project {
	const ts = now();
	const res = getDb()
		.prepare(
			`INSERT INTO projects
				(slug, title, description, repo_url, demo_url, tags, cover_media_id, pub_date, status, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
		)
		.run(
			input.slug, input.title, input.description, input.repo_url, input.demo_url,
			JSON.stringify(input.tags), input.cover_media_id, input.pub_date, input.status, ts, ts
		);
	return getProjectById(Number(res.lastInsertRowid))!;
}

export function updateProject(id: number, input: ProjectInput): Project {
	getDb()
		.prepare(
			`UPDATE projects SET
				slug = ?, title = ?, description = ?, repo_url = ?, demo_url = ?, tags = ?,
				cover_media_id = ?, pub_date = ?, status = ?, updated_at = ?
			 WHERE id = ?`
		)
		.run(
			input.slug, input.title, input.description, input.repo_url, input.demo_url,
			JSON.stringify(input.tags), input.cover_media_id, input.pub_date, input.status, now(), id
		);
	return getProjectById(id)!;
}

export function deleteProject(id: number): void {
	getDb().prepare('DELETE FROM projects WHERE id = ?').run(id);
}

/* -------------------------------- settings -------------------------------- */

export type Settings = Record<string, string>;

export function getSettings(): Settings {
	const rows = getDb().prepare('SELECT key, value FROM settings').all() as Array<{ key: string; value: string }>;
	return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export function getSetting(key: string): string | null {
	const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key) as
		| { value: string }
		| undefined;
	return row ? row.value : null;
}

export function putSetting(key: string, value: string): void {
	getDb()
		.prepare(
			'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
		)
		.run(key, value);
}

/* --------------------------------- profile -------------------------------- */

export type Profile = {
	name: string;
	role: string;
	bio_md: string;
	avatar_media_id: number | null;
	banner_media_id: number | null;
};

export function getProfile(): Profile {
	const row = getDb().prepare('SELECT * FROM profile WHERE id = 1').get() as unknown as
		| (Profile & { id: number })
		| undefined;
	return row
		? {
				name: row.name,
				role: row.role,
				bio_md: row.bio_md,
				avatar_media_id: row.avatar_media_id,
				banner_media_id: row.banner_media_id
			}
		: { name: '', role: '', bio_md: '', avatar_media_id: null, banner_media_id: null };
}

export function updateProfile(input: Profile): void {
	getDb()
		.prepare(
			'UPDATE profile SET name = ?, role = ?, bio_md = ?, avatar_media_id = ?, banner_media_id = ? WHERE id = 1'
		)
		.run(input.name, input.role, input.bio_md, input.avatar_media_id, input.banner_media_id);
}

export function mediaUrl(id: number | null | undefined): string | null {
	return id ? `/media/${id}` : null;
}

/* --------------------------------- about ---------------------------------- */

export type ExperienceRow = { id: number; company: string; role: string; period: string; bullets: string; ord: number };
export type SkillRow = { id: number; heading: string; items: string; ord: number };
export type EducationRow = { id: number; title: string; ord: number };

export function listExperience(): ExperienceRow[] {
	return getDb().prepare('SELECT * FROM about_experience ORDER BY ord, id').all() as ExperienceRow[];
}
export function listSkills(): SkillRow[] {
	return getDb().prepare('SELECT * FROM about_skills ORDER BY ord, id').all() as SkillRow[];
}
export function listEducation(): EducationRow[] {
	return getDb().prepare('SELECT * FROM about_education ORDER BY ord, id').all() as EducationRow[];
}

export function replaceAbout(
	experience: Omit<ExperienceRow, 'id'>[],
	skills: Omit<SkillRow, 'id'>[],
	education: Omit<EducationRow, 'id'>[]
): void {
	const db = getDb();
	db.exec('BEGIN');
	try {
		db.prepare('DELETE FROM about_experience').run();
		db.prepare('DELETE FROM about_skills').run();
		db.prepare('DELETE FROM about_education').run();
		const insExp = db.prepare('INSERT INTO about_experience (company, role, period, bullets, ord) VALUES (?, ?, ?, ?, ?)');
		experience.forEach((x, i) => insExp.run(x.company, x.role, x.period, x.bullets, x.ord ?? i));
		const insSkill = db.prepare('INSERT INTO about_skills (heading, items, ord) VALUES (?, ?, ?)');
		skills.forEach((x, i) => insSkill.run(x.heading, x.items, x.ord ?? i));
		const insEdu = db.prepare('INSERT INTO about_education (title, ord) VALUES (?, ?)');
		education.forEach((x, i) => insEdu.run(x.title, x.ord ?? i));
		db.exec('COMMIT');
	} catch (err) {
		db.exec('ROLLBACK');
		throw err;
	}
}

/* ---------------------------------- media --------------------------------- */

const MIME_BY_EXT: Record<string, string> = {
	svg: 'image/svg+xml',
	png: 'image/png',
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	webp: 'image/webp',
	gif: 'image/gif',
	avif: 'image/avif'
};

export function mimeForFilename(filename: string): string {
	const ext = filename.split('.').pop()?.toLowerCase() || '';
	return MIME_BY_EXT[ext] || 'application/octet-stream';
}

export function createMedia(params: { filename: string; mime: string; data: Uint8Array; alt?: string; width?: number | null; height?: number | null }): MediaRow {
	const hash = createHash('md5').update(params.data).digest('hex');
	const res = getDb()
		.prepare(
			'INSERT INTO media (filename, mime, width, height, size, hash, alt, data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
		)
		.run(
			params.filename, params.mime, params.width ?? null, params.height ?? null,
			params.data.byteLength, hash, params.alt || '', params.data, now()
		);
	return getMedia(Number(res.lastInsertRowid))!;
}

export function getMedia(id: number): MediaRow | null {
	return (getDb().prepare('SELECT * FROM media WHERE id = ?').get(id) as unknown as MediaRow | undefined) || null;
}

export function listMedia(): MediaRow[] {
	return getDb()
		.prepare('SELECT id, filename, mime, width, height, size, hash, alt, created_at FROM media ORDER BY id DESC')
		.all() as unknown as MediaRow[];
}

export function deleteMedia(id: number): void {
	getDb().prepare('DELETE FROM media WHERE id = ?').run(id);
}

export function setProfileImage(kind: 'avatar' | 'banner', mediaId: number): void {
	if (kind === 'avatar') {
		getDb().prepare('UPDATE profile SET avatar_media_id = ? WHERE id = 1').run(mediaId);
	} else {
		getDb().prepare('UPDATE profile SET banner_media_id = ? WHERE id = 1').run(mediaId);
	}
}

/* -------------------------------- account --------------------------------- */

export type CmsAccountRow = {
	id: number;
	username: string;
	password_hash: string;
	updated_at: string;
};

export function getAccount(): CmsAccountRow | null {
	const row = getDb()
		.prepare('SELECT id, username, password_hash, updated_at FROM cms_account WHERE id = 1')
		.get() as unknown as CmsAccountRow | undefined;
	return row ?? null;
}

export function upsertAccount(username: string, passwordHash: string): void {
	getDb()
		.prepare(
			`INSERT INTO cms_account (id, username, password_hash, updated_at)
			 VALUES (1, ?, ?, ?)
			 ON CONFLICT(id) DO UPDATE SET
				username = excluded.username,
				password_hash = excluded.password_hash,
				updated_at = excluded.updated_at`
		)
		.run(username, passwordHash, now());
}

/* -------------------------------- sessions -------------------------------- */

// Sessions are stateless JWT cookies — see src/lib/jwt.ts and src/lib/session.ts.
// No session table is needed.

/* --------------------------------- stats ---------------------------------- */

export function summarizeRows(table: 'posts' | 'projects', status: string | null = null): number {
	const where = status ? `WHERE status = '${status}'` : '';
	return Number((getDb().prepare(`SELECT COUNT(*) AS c FROM ${table} ${where}`).get() as any).c ?? 0);
}

export function countMedia(): number {
	return Number((getDb().prepare('SELECT COUNT(*) AS c FROM media').get() as any).c ?? 0);
}
