import type { APIRoute } from 'astro';
import { deleteProject } from '../../../../lib/db';

export const POST: APIRoute = async (context) => {
	const form = await context.request.formData();
	const id = Number.parseInt(String(form.get('id') || ''), 10);
	if (Number.isFinite(id) && id > 0) {
		deleteProject(id);
	}
	return context.redirect('/cms/projects', 303);
};
