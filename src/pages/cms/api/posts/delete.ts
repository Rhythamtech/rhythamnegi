import type { APIRoute } from 'astro';
import { deletePost } from '../../../../lib/db';

export const POST: APIRoute = async (context) => {
	const form = await context.request.formData();
	const id = Number.parseInt(String(form.get('id') || ''), 10);
	if (Number.isFinite(id) && id > 0) {
		deletePost(id);
	}
	return context.redirect('/cms/posts', 303);
};
