import type { APIRoute } from 'astro';
import { getProfile, putSetting, updateProfile } from '../../../lib/db';
import { uploadImage, isUploadImageError } from '../../../lib/cms';

export const POST: APIRoute = async (context) => {
	try {
		const form = await context.request.formData();

		/* settings */
		putSetting('site_title', String(form.get('site_title') || '').trim());
		putSetting('site_tagline', String(form.get('site_tagline') || '').trim());
		putSetting('site_description', String(form.get('site_description') || '').trim());
		putSetting('github_url', String(form.get('github_url') || '').trim());
		putSetting('linkedin_url', String(form.get('linkedin_url') || '').trim());

		/* profile row */
		const profile = getProfile();
		const next: typeof profile = {
			name: String(form.get('name') || '').trim() || profile.name,
			role: String(form.get('role') || '').trim(),
			bio_md: String(form.get('bio_md') || ''),
			avatar_media_id: profile.avatar_media_id,
			banner_media_id: profile.banner_media_id
		};

		const avatarFile = form.get('avatar_file');
		if (avatarFile instanceof File && avatarFile.size) {
			const media = await uploadImage(avatarFile, next.name || 'avatar');
			next.avatar_media_id = media.id;
		}
		const bannerFile = form.get('banner_file');
		if (bannerFile instanceof File && bannerFile.size) {
			const media = await uploadImage(bannerFile, 'Homepage banner');
			next.banner_media_id = media.id;
		}

		updateProfile(next);

		return context.redirect('/cms/profile?saved=1', 303);
	} catch (err) {
		console.error('Saving profile failed:', err, err instanceof Error ? isUploadImageError(err) : '');
		return context.redirect('/cms/profile?error=1', 303);
	}
};

// GET is not supported on this endpoint (middleware already redirects unauthenticated GETs here).
export const GET: APIRoute = async (context) => context.redirect('/cms/profile', 303);
