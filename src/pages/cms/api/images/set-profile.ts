import type { APIRoute } from 'astro';
import { setProfileImage } from '../../../../lib/db';

export const POST: APIRoute = async (context) => {
	try {
		const form = await context.request.formData();
		const id = Number.parseInt(String(form.get('id') || ''), 10);
		const kind = String(form.get('kind') || '') === 'banner' ? 'banner' : 'avatar';
		if (Number.isFinite(id) && id > 0) {
			setProfileImage(kind, id);
		}
		return context.redirect(`/cms/images?id=${id}&saved=${kind}`, 303);
	} catch (err) {
		console.error('Setting profile image failed:', err);
		return context.redirect('/cms/images?error=1', 303);
	}
};
