import type { APIRoute } from 'astro';
import {
	createPost,
	getDb,
	getPostBySlug,
	uniqueSlug,
	updatePost,
	type PostInput
} from '../../../../lib/db';
import { uploadImage } from '../../../../lib/cms';
import { slugify } from '../../../../utils';

/**
 * Import a JSON bundle produced by /cms/api/posts/export.
 *
 * Posts are matched by slug: an existing slug is updated in place, a new slug is
 * created (with a numeric suffix on collision). Cover images embedded in the
 * bundle are re-uploaded through the normal image pipeline.
 */

const MAX_IMPORT_BYTES = 25 * 1024 * 1024; // 25 MB JSON file
const MAX_POSTS = 500;
const MAX_COVER_BYTES = 8 * 1024 * 1024;

type Row = Record<string, unknown>;

export const POST: APIRoute = async (context) => {
	try {
		const form = await context.request.formData();
		const file = form.get('file');

		if (!(file instanceof File) || file.size === 0) {
			return context.redirect('/cms/posts?error=file', 303);
		}
		if (file.size > MAX_IMPORT_BYTES) {
			return context.redirect('/cms/posts?error=size', 303);
		}

		let parsed: unknown;
		try {
			parsed = JSON.parse(await file.text());
		} catch {
			return context.redirect('/cms/posts?error=json', 303);
		}

		const rawList = Array.isArray(parsed)
			? parsed
			: (parsed as { posts?: unknown } | null)?.posts;
		if (!Array.isArray(rawList) || rawList.length === 0) {
			return context.redirect('/cms/posts?error=empty', 303);
		}
		if (rawList.length > MAX_POSTS) {
			return context.redirect('/cms/posts?error=count', 303);
		}

		const rows = rawList.filter(
			(item): item is Row => !!item && typeof item === 'object' && !Array.isArray(item)
		);
		if (rows.length === 0) {
			return context.redirect('/cms/posts?error=empty', 303);
		}

		// Cover uploads are async and write media rows — do them before opening the
		// write transaction so no other request can interleave with the transaction.
		const prepared: { row: Row; coverId: number | null; hasCover: boolean }[] = [];
		for (const row of rows) {
			let coverId: number | null = null;
			let hasCover = false;

			const cover = row.cover as Row | null | undefined;
			if (cover && typeof cover === 'object' && typeof cover.data === 'string' && cover.data) {
				hasCover = true;
				try {
					const bytes = Buffer.from(cover.data, 'base64');
					if (bytes.byteLength > 0 && bytes.byteLength <= MAX_COVER_BYTES) {
						const upload = new File([bytes], String(cover.filename || 'cover'), {
							type: String(cover.mime || 'image/webp')
						});
						const saved = await uploadImage(upload, String(cover.alt || row.title || 'Cover'));
						coverId = saved.id;
					}
				} catch (err) {
					console.error('Import skipped a cover image:', err);
				}
			}

			prepared.push({ row, coverId, hasCover });
		}

		let imported = 0;
		let skipped = 0;

		const db = getDb();
		db.exec('BEGIN');
		try {
			for (const { row, coverId, hasCover } of prepared) {
				const title = String(row.title ?? '').trim();
				if (!title) {
					skipped++;
					continue;
				}

				const slugBase = slugify(String(row.slug ?? '').trim() || title) || 'post';
				const existing = getPostBySlug(slugBase, false);

				const input: PostInput = {
					slug: existing ? existing.slug : uniqueSlug('posts', slugBase, null),
					title,
					seo_title: row.seo_title ? String(row.seo_title).trim() : null,
					description: String(row.description ?? ''),
					body_md: String(row.body_md ?? ''),
					tags: Array.isArray(row.tags)
						? row.tags.map((tag) => String(tag).trim()).filter(Boolean)
						: [],
					cover_media_id: hasCover && coverId !== null ? coverId : existing?.cover_media_id ?? null,
					pub_date: cleanDate(row.pub_date),
					updated_date: cleanDate(row.updated_date),
					status: row.status === 'published' ? 'published' : 'draft'
				};

				if (existing) updatePost(existing.id, input);
				else createPost(input);
				imported++;
			}
			db.exec('COMMIT');
		} catch (err) {
			db.exec('ROLLBACK');
			throw err;
		}

		return context.redirect(`/cms/posts?imported=${imported}&skipped=${skipped}`, 303);
	} catch (err) {
		console.error('Importing posts failed:', err);
		return context.redirect('/cms/posts?error=import', 303);
	}
};

/** Accepts YYYY-MM-DD or any parsable date; normalises to YYYY-MM-DD. */
function cleanDate(value: unknown): string | null {
	if (value === null || value === undefined || value === '') return null;
	const date = new Date(String(value));
	if (Number.isNaN(date.getTime())) return null;
	return date.toISOString().slice(0, 10);
}
