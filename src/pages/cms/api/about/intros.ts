import type { APIRoute } from 'astro';
import { putSetting } from '../../../../lib/db';

export const POST: APIRoute = async (context) => {
	try {
		const form = await context.request.formData();
		putSetting('hero_intro', String(form.get('hero_intro') || ''));
		putSetting('about_intro', String(form.get('about_intro') || ''));
		return context.redirect('/cms/about?saved=1', 303);
	} catch (err) {
		console.error('Saving intros failed:', err);
		return context.redirect('/cms/about?error=1', 303);
	}
};
