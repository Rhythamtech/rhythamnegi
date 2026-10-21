import type { APIRoute } from 'astro';
import { getDb } from '../../../../../lib/db';

export const POST: APIRoute = async (context) => {
	try {
		const form = await context.request.formData();
		const id = Number.parseInt(String(form.get('id') || ''), 10);
		if (Number.isFinite(id) && id > 0) {
			getDb().prepare('DELETE FROM about_skills WHERE id = ?').run(id);
		}
		return context.redirect('/cms/about', 303);
	} catch (err) {
		console.error('Deleting skill failed:', err);
		return context.redirect('/cms/about?error=1', 303);
	}
};
