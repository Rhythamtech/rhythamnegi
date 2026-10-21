import type { APIRoute } from 'astro';
import { getDb, listEducation, type EducationRow } from '../../../../lib/db';

/** Bulk-saves the education editor rows (id[] + title-<id>, ord-<id>). */
export const POST: APIRoute = async (context) => {
	try {
		const form = await context.request.formData();
		const ids = form.getAll('id').map((v) => String(v));
		const db = getDb();

		const current = new Map<number, EducationRow>(listEducation().map((r) => [r.id, r]));
		const upd = db.prepare('UPDATE about_education SET title = ?, ord = ? WHERE id = ?');

		for (const idRaw of ids) {
			const id = Number.parseInt(idRaw, 10);
			if (!Number.isFinite(id) || !current.has(id)) continue;
			upd.run(
				String(form.get(`title-${id}`) || ''),
				Number.parseInt(String(form.get(`ord-${id}`) || '0'), 10) || 0,
				id
			);
		}

		return context.redirect('/cms/about?saved=1', 303);
	} catch (err) {
		console.error('Saving education failed:', err);
		return context.redirect('/cms/about?error=1', 303);
	}
};
