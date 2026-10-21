#!/usr/bin/env node
/**
 * One-time content migration: markdown files + bundled images -> SQLite.
 *
 *   node scripts/migrate-content.mjs
 *   SQLITE_PATH=./data/cms.db node scripts/migrate-content.mjs
 *   ... --force   (wipe imported tables first)
 *
 * Reads:
 *   - src/content/blog &lt;slug&gt;/index.md      -> posts
 *   - src/content/projects &lt;slug&gt;/index.md  -> projects
 *   - src/assets/img/pfp.png | banner.png -> profile avatar/banner media
 *   - referenced coverImages (src/assets/thumbnails/*.svg) -> media
 *
 * Seeds site settings, profile and About-page sections with the values that
 * were previously hardcoded in src/consts.ts / about.astro / Author.astro.
 *
 * The schema DDL below mirrors src/lib/db.ts so the script is standalone —
 * src/lib/db.ts remains the canonical schema for the running app.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import matter from 'gray-matter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const FORCE = process.argv.includes('--force');

/* ------------------------- env (mirrors src/lib/env.ts) ------------------------- */

function loadEnv() {
	const env = { ...process.env };
	for (const file of ['.env.production', '.env'].reverse()) {
		const p = path.join(process.cwd(), file);
		if (!fs.existsSync(p)) continue;
		for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
			const t = line.trim();
			if (!t || t.startsWith('#')) continue;
			const eq = t.indexOf('=');
			if (eq <= 0) continue;
			const key = t.slice(0, eq).trim();
			let val = t.slice(eq + 1).trim();
			if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
				val = val.slice(1, -1);
			}
			if (!(key in env)) env[key] = val;
		}
	}
	return env;
}

const env = loadEnv();
const configured = env.SQLITE_PATH || './data/cms.db';
const DB_FILE = path.isAbsolute(configured) ? configured : path.join(process.cwd(), configured);

/* --------------------------------- schema --------------------------------- */

const SCHEMA = `
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
	CREATE TABLE IF NOT EXISTS sessions (
		token      TEXT PRIMARY KEY,
		username   TEXT NOT NULL,
		expires_at INTEGER NOT NULL,
		created_at TEXT NOT NULL
	);
`;

/* --------------------------------- helpers -------------------------------- */

const MIME_BY_EXT = {
	svg: 'image/svg+xml',
	png: 'image/png',
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	webp: 'image/webp',
	gif: 'image/gif',
	avif: 'image/avif'
};
const mimeFor = (file) => MIME_BY_EXT[String(file).split('.').pop().toLowerCase()] || 'application/octet-stream';

const DEFAULT_SETTINGS = {
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

/* ----------------------------------- main --------------------------------- */

function main() {
	fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
	const db = new DatabaseSync(DB_FILE);
	db.exec('PRAGMA journal_mode = WAL;');
	db.exec(SCHEMA);

	if (FORCE) {
		console.log('  --force: clearing existing imported data …');
		db.exec(
			'DELETE FROM posts; DELETE FROM projects; DELETE FROM media; DELETE FROM settings; DELETE FROM profile; DELETE FROM about_experience; DELETE FROM about_skills; DELETE FROM about_education;'
		);
	} else {
		const postCount = Number(db.prepare('SELECT COUNT(*) AS c FROM posts').get().c);
		if (postCount > 0) {
			console.error(`Database at ${DB_FILE} already contains ${postCount} post(s).`);
			console.error('Run with --force to wipe imported data and re-import.');
			db.close();
			process.exit(1);
		}
	}

	const hashOf = (buf) => createHash('md5').update(buf).digest('hex');
	const insertMedia = (absolutePath, { alt = '', filename } = {}) => {
		if (!absolutePath || !fs.existsSync(absolutePath)) return null;
		const data = fs.readFileSync(absolutePath);
		const hash = hashOf(data);
		const existing = db.prepare('SELECT id FROM media WHERE hash = ?').get(hash);
		if (existing) return existing.id;
		const res = db
			.prepare(
				'INSERT INTO media (filename, mime, size, hash, alt, data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
			)
			.run(
				filename || path.basename(absolutePath), mimeFor(absolutePath), data.byteLength,
				hash, alt, data, new Date().toISOString()
			);
		return Number(res.lastInsertRowid);
	};

	/* ----------------------------- settings/profile ---------------------------- */

	const settingsCount = Number(db.prepare('SELECT COUNT(*) AS c FROM settings').get().c);
	if (settingsCount === 0) {
		const put = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
		for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) put.run(k, v);
	}

	const profileCount = Number(db.prepare('SELECT COUNT(*) AS c FROM profile').get().c);
	if (profileCount === 0) {
		const name = (db.prepare("SELECT value FROM settings WHERE key = 'site_title'").get() || { value: 'Rhytham Negi' }).value;
		const role = (db.prepare("SELECT value FROM settings WHERE key = 'site_tagline'").get() || { value: '' }).value;
		db.prepare('INSERT INTO profile (id, name, role, bio_md) VALUES (1, ?, ?, ?)').run(name, role, '');
	}

	const avatarId = insertMedia(path.join(ROOT, 'src/assets/img/pfp.png'), { alt: 'Profile picture' });
	const bannerId = insertMedia(path.join(ROOT, 'src/assets/img/banner.png'), { alt: 'Site banner' });
	if (avatarId || bannerId) {
		db.prepare('UPDATE profile SET avatar_media_id = COALESCE(?, avatar_media_id), banner_media_id = COALESCE(?, banner_media_id) WHERE id = 1')
			.run(avatarId, bannerId);
	}

	/* ---------------------------- about page content --------------------------- */

	const expIns = db.prepare('INSERT INTO about_experience (company, role, period, bullets, ord) VALUES (?, ?, ?, ?, ?)');
	[
		{
			company: 'Publicis Groupe, Gurugram, India',
			role: 'Software Developer - AI/ML',
			period: 'October 2024 - Present',
			bullets: [
				'Embedded LLMs to generate real-time automated business insights in a media product.',
				'Built NLP workflows and RAG pipelines using LangChain, LangGraph, and Redis.',
				'Managed model lifecycle across proprietary and open-source models based on performance and cost.',
				'Implemented multi-modal AI features using Azure OpenAI for vision and speech analysis.'
			]
		},
		{
			company: 'Publicis Groupe, Gurugram, India',
			role: 'Associate Software Developer',
			period: 'August 2022 - December 2024',
			bullets: [
				'Data Engineering: Engineered data pipelines data flow from 8+ platforms (e.g., Google, Amazon, Zepto) into STG/DIM/FACT tables.',
				'Database Development: Created optimized Stored Procedures and SQL Views to support Power BI dashboard reporting.',
				'Backend Development: Developed and enhanced RESTful APIs using Java and Spring Boot.'
			]
		},
		{
			company: 'Publicis Groupe, Gurugram, India',
			role: 'Software - Intern',
			period: 'February 2022 - September 2022',
			bullets: [
				'Contributed to the development of an internal product at Publicis Media as a software engineering intern.',
				'Designed and created database tables to support application features and data storage.',
				'Implemented backend features using Spring Boot and REST APIs.',
				'Analyzed production-grade API architecture and data flow to improve system understanding and performance.'
			]
		}
	].forEach((x, i) => expIns.run(x.company, x.role, x.period, x.bullets.join('\n'), i));

	const skillIns = db.prepare('INSERT INTO about_skills (heading, items, ord) VALUES (?, ?, ?)');
	[
		{ heading: 'Technical Skills', items: 'Java, Python, Django Framework, FastAPI, Generative AI, NLP, LangChain, LangGraph' },
		{ heading: 'Tools & OS', items: 'Windows, Linux, MS-DOS, MS Office' },
		{ heading: 'Languages', items: 'English, Hindi' }
	].forEach((x, i) => skillIns.run(x.heading, x.items, i));

	const eduIns = db.prepare('INSERT INTO about_education (title, ord) VALUES (?, ?)');
	['Full stack generative and Agentic AI with python - Udemy', 'Ultimate RAG Bootcamp Using Langchain, LangGraph & Langsmith - Udemy']
		.forEach((t, i) => eduIns.run(t, i));

	/* --------------------------- posts + projects ----------------------------- */

	const insertPost = db.prepare(
		`INSERT INTO posts (slug, title, seo_title, description, body_md, tags, cover_media_id, pub_date, updated_date, status, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?)`
	);
	const insertProject = db.prepare(
		`INSERT INTO projects (slug, title, description, repo_url, demo_url, tags, cover_media_id, pub_date, status, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?)`
	);

	const normalizeDate = (raw) => {
		if (!raw) return null;
		const d = raw instanceof Date ? raw : new Date(raw);
		if (isNaN(d.getTime())) return null;
		return d.toISOString().slice(0, 10);
	};

	const importCollection = (dirName, kind) => {
		const base = path.join(ROOT, 'src/content', dirName);
		if (!fs.existsSync(base)) {
			console.warn(`  ! missing folder ${base}, skipping`);
			return 0;
		}
		let count = 0;
		for (const slug of fs.readdirSync(base)) {
			const mdPath = path.join(base, slug, 'index.md');
			if (!fs.existsSync(mdPath)) continue;
			const { data, content } = matter(fs.readFileSync(mdPath, 'utf8'));
			let coverId = null;
			if (data.coverImage) {
				const resolved = path.resolve(mdPath, '..', String(data.coverImage));
				if (fs.existsSync(resolved)) {
					coverId = insertMedia(resolved, { alt: data.title || slug });
				} else {
					console.warn(`  ! cover image not found for ${dirName}/${slug}: ${resolved}`);
				}
			}
			const ts = new Date().toISOString();
			const pubDate = normalizeDate(data.pubDate);
			const tags = Array.isArray(data.tags) ? data.tags.map(String).filter(Boolean) : [];
			if (kind === 'post') {
				insertPost.run(
					slug, String(data.title || slug), data.seoTitle || null, String(data.description || ''),
					content, JSON.stringify(tags), coverId, pubDate, normalizeDate(data.updatedDate), ts, ts
				);
			} else {
				insertProject.run(
					slug, String(data.title || slug), String(data.description || ''),
					data.repoURL || null, data.demoURL || null, JSON.stringify(tags), coverId, pubDate, ts, ts
				);
			}
			count += 1;
		}
		return count;
	};

	const postCount = importCollection('blog', 'post');
	const projectCount = importCollection('projects', 'project');

	console.log(`Imported into ${DB_FILE}:`);
	console.log(`  posts:    ${postCount}`);
	console.log(`  projects: ${projectCount}`);
	console.log(`  media:    ${Number(db.prepare('SELECT COUNT(*) AS c FROM media').get().c)} images (incl. profile/banner)`);
	console.log(`  settings: seeded ${settingsCount === 0 ? 'defaults' : `${Number(db.prepare('SELECT COUNT(*) AS c FROM settings').get().c)} keys (existing)`}`);
	db.close();
}

main();
