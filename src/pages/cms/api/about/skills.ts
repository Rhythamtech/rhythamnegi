import type { APIRoute } from 'astro';
import { getDb, listSkills, type SkillRow } from '../../../../lib/db';

/** Bulk-saves the skills editor rows (id[] + heading-<id>, items-<id>, ord-<id>). */
export const POST: APIRoute = async (context) => {
	try {
		const form = await context.request.formData();
		const ids = form.getAll('id').map((v) => String(v));
		const db = getDb();

		const current = new Map<number, SkillRow>(listSkills().map((r) => [r.id, r]));
		const upd = db.prepare('UPDATE about_skills SET heading = ?, items = ?, ord = ? WHERE id = ?');

		for (const idRaw of ids) {
			const id = Number.parseInt(idRaw, 10);
			if (!Number.isFinite(id) || !current.has(id)) continue;
			upd.run(
				String(form.get(`heading-${id}`) || ''),
				String(form.get(`items-${id}`) || ''),
				Number.parseInt(String(form.get(`ord-${id}`) || '0'), 10) || 0,
				id
			);
		}

		return context.redirect('/cms/about?saved=1', 303);
	} catch (err) {
		console.error('Saving skills failed:', err);
		return context.redirect('/cms/about?error=1', 303);
	}
};
