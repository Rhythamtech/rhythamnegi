import type { APIRoute } from 'astro';
import { createPost, uniqueSlug, updatePost, type PostInput } from '../../../lib/db';
import { slugify } from '../../../utils';
import { uploadImage, isUploadImageError } from '../../../lib/cms';

export const POST: APIRoute = async (context) => {
	try {
		const form = await context.request.formData();
		const idRaw = String(form.get('id') || '');
		const id = idRaw ? Number.parseInt(idRaw, 10) : null;

		const title = String(form.get('title') || '').trim();
		if (!title) {
			return context.redirect('/cms/posts?error=1', 303);
		}

		const slugBase = slugify(String(form.get('slug') || '').trim() || title);
		const tags = String(form.get('tags') || '')
			.split(',')
			.map((t) => t.trim())
			.filter(Boolean);
		const status = String(form.get('status')) === 'published' ? 'published' : 'draft';
		const seoTitleRaw = String(form.get('seo_title') || '').trim();
		const pubDateRaw = String(form.get('pub_date') || '').trim();
		const updatedRaw = String(form.get('updated_date') || '').trim();

		// Optional new cover upload
		const file = form.get('cover_file');
		let coverMediaId: number | null = form.get('cover_media_id')
			? Number.parseInt(String(form.get('cover_media_id')), 10) || null
			: null;
		if (file instanceof File && file.size) {
			try {
				const saved = await uploadImage(file, title);
				coverMediaId = saved.id;
			} catch (err) {
				console.warn('Inline cover upload skipped:', isUploadImageError(err));
			}
		}

		const input: PostInput = {
			slug: slugBase,
			title,
			seo_title: seoTitleRaw || null,
			description: String(form.get('description') || '').trim(),
			body_md: String(form.get('body_md') || ''),
			tags,
			cover_media_id: coverMediaId,
			pub_date: pubDateRaw || null,
			updated_date: updatedRaw || null,
			status
		};

		let savedPost;
		if (id) {
			input.slug = uniqueSlug('posts', slugBase, id);
			savedPost = updatePost(id, input);
		} else {
			input.slug = uniqueSlug('posts', slugBase, null);
			savedPost = createPost(input);
		}

		return context.redirect(`/cms/post-edit?id=${savedPost.id}&saved=1`, 303);
	} catch (err) {
		console.error('Saving post failed:', err);
		return context.redirect('/cms/posts?saved=error', 303);
	}
};
