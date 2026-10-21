import type { APIRoute } from 'astro';
import { getDb, listExperience, type ExperienceRow } from '../../../../lib/db';

/**
 * Bulk-saves the experience editor: rows arrive as
 *   id[]        = [id1, id2, …]
 *   company-<id>, role-<id>, period-<id>, ord-<id>, bullets-<id>
 */
export const POST: APIRoute = async (context) => {
	try {
		const form = await context.request.formData();
		const ids = form.getAll('id').map((v) => String(v));
		const db = getDb();

		const rows = listExperience();
		/** rows editable in the form, keyed by id */
		const current = new Map<number, ExperienceRow>(rows.map((r) => [r.id, r]));

		const upd = db.prepare(
			'UPDATE about_experience SET company = ?, role = ?, period = ?, bullets = ?, ord = ? WHERE id = ?'
		);

		for (const idRaw of ids) {
			const id = Number.parseInt(idRaw, 10);
			if (!Number.isFinite(id) || !current.has(id)) continue;
			upd.run(
				String(form.get(`company-${id}`) || ''),
				String(form.get(`role-${id}`) || ''),
				String(form.get(`period-${id}`) || ''),
				String(form.get(`bullets-${id}`) || ''),
				Number.parseInt(String(form.get(`ord-${id}`) || '0'), 10) || 0,
				id
			);
		}

		return context.redirect('/cms/about?saved=1', 303);
	} catch (err) {
		console.error('Saving experience failed:', err);
		return context.redirect('/cms/about?error=1', 303);
	}
};
