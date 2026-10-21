import type { APIRoute } from 'astro';
import { createProject, uniqueSlug, updateProject, type ProjectInput } from '../../../lib/db';
import { slugify } from '../../../utils';
import { uploadImage, isUploadImageError } from '../../../lib/cms';

export const POST: APIRoute = async (context) => {
	try {
		const form = await context.request.formData();
		const idRaw = String(form.get('id') || '');
		const id = idRaw ? Number.parseInt(idRaw, 10) : null;

		const title = String(form.get('title') || '').trim();
		if (!title) return context.redirect('/cms/projects', 303);

		const slugBase = slugify(String(form.get('slug') || '').trim() || title);
		const tags = String(form.get('tags') || '')
			.split(',')
			.map((t) => t.trim())
			.filter(Boolean);
		const status = String(form.get('status')) === 'published' ? 'published' : 'draft';
		const repoUrlRaw = String(form.get('repo_url') || '').trim();
		const demoUrlRaw = String(form.get('demo_url') || '').trim();
		const pubDateRaw = String(form.get('pub_date') || '').trim();

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

		const input: ProjectInput = {
			slug: slugBase,
			title,
			description: String(form.get('description') || '').trim(),
			repo_url: repoUrlRaw || null,
			demo_url: demoUrlRaw || null,
			tags,
			cover_media_id: coverMediaId,
			pub_date: pubDateRaw || null,
			status
		};

		let savedId: number;
		if (id) {
			input.slug = uniqueSlug('projects', slugBase, id);
			savedId = updateProject(id, input).id;
		} else {
			input.slug = uniqueSlug('projects', slugBase, null);
			savedId = createProject(input).id;
		}

		return context.redirect(`/cms/project-edit?id=${savedId}&saved=1`, 303);
	} catch (err) {
		console.error('Saving project failed:', err);
		return context.redirect('/cms/projects', 303);
	}
};
