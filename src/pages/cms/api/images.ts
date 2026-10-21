import type { APIRoute } from 'astro';
import { uploadImage, isUploadImageError } from '../../../lib/cms';

export const POST: APIRoute = async (context) => {
	try {
		const form = await context.request.formData();
		const file = form.get('file');
		if (!(file instanceof File) || !file.size) {
			return context.redirect('/cms/images?error=empty', 303);
		}
		const alt = String(form.get('alt') || '').trim();
		const media = await uploadImage(file, alt);
		return context.redirect(`/cms/images?id=${media.id}&saved=upload`, 303);
	} catch (err) {
		console.error('Image upload failed:', err);
		switch (isUploadImageError(err)) {
			case 'File too large (max 8 MB).':
				return context.redirect('/cms/images?error=large', 303);
			case 'Please upload an image file.':
				return context.redirect('/cms/images?error=type', 303);
			case 'No file was provided.':
				return context.redirect('/cms/images?error=empty', 303);
			default:
				return context.redirect('/cms/images?error=1', 303);
		}
	}
};
