import type { APIRoute } from 'astro';
import { getMedia, listPosts } from '../../../../lib/db';

/**
 * Export every post as a single JSON bundle, cover images included (base64).
 * Downloading a GET is safe and the route sits behind the CMS auth middleware.
 */
export const GET: APIRoute = async () => {
	const posts = listPosts();

	const items = posts.map((post) => {
		const media = post.cover_media_id ? getMedia(post.cover_media_id) : null;
		return {
			slug: post.slug,
			title: post.title,
			seo_title: post.seo_title,
			description: post.description,
			body_md: post.body_md,
			tags: post.tags,
			pub_date: post.pubDate ? post.pubDate.toISOString().slice(0, 10) : null,
			updated_date: post.updatedDate ? post.updatedDate.toISOString().slice(0, 10) : null,
			status: post.status,
			cover: media
				? {
						filename: media.filename,
						mime: media.mime,
						alt: media.alt,
						data: Buffer.from(media.data).toString('base64')
					}
				: null
		};
	});

	const payload = {
		format: 'devfolio-posts',
		version: 1,
		exportedAt: new Date().toISOString(),
		count: items.length,
		posts: items
	};

	const filename = `devfolio-posts-${new Date().toISOString().slice(0, 10)}.json`;

	return new Response(JSON.stringify(payload, null, 2), {
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			'Content-Disposition': `attachment; filename="${filename}"`,
			'Cache-Control': 'no-store'
		}
	});
};
