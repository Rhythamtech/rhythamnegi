import type { APIRoute } from 'astro';
import { deleteMedia, getMedia, getProfile, setProfileImage, updateProfile } from '../../../../lib/db';

export const POST: APIRoute = async (context) => {
	try {
		const form = await context.request.formData();
		const id = Number.parseInt(String(form.get('id') || ''), 10);
		if (Number.isFinite(id) && id > 0) {
			// Detach the image from the profile if it is currently in use.
			const media = getMedia(id);
			if (media) {
				const profile = getProfile();
				updateProfile({
					...profile,
					avatar_media_id: profile.avatar_media_id === id ? null : profile.avatar_media_id,
					banner_media_id: profile.banner_media_id === id ? null : profile.banner_media_id
				});
			}
			deleteMedia(id);
		}
		return context.redirect('/cms/images?saved=delete', 303);
	} catch (err) {
		console.error('Image deletion failed:', err);
		return context.redirect('/cms/images?error=1', 303);
	}
};
