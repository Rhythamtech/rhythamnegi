import type { APIContext } from 'astro';
import { listPosts } from '../lib/db';
import { slugify } from '../utils';
type SitemapEntry = {
	loc: string;
	lastmod?: string | null;
	changefreq?: string;
	priority?: number;
};

function esc(value: string): string {
	return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export async function GET(context: APIContext) {
	const site = context.site ?? new URL('https://rhythamnegi.com');
	const posts = listPosts({ publishedOnly: true });

	const entries: SitemapEntry[] = [
		{ loc: '/', changefreq: 'weekly', priority: 1.0 },
		{ loc: '/blog/', changefreq: 'weekly', priority: 0.9 },
		{ loc: '/projects/', changefreq: 'monthly', priority: 0.8 },
		{ loc: '/about/', changefreq: 'monthly', priority: 0.7 },
		{ loc: '/tags/', changefreq: 'weekly', priority: 0.6 }
	];

	// latest updated date across all published posts, for the homepage lastmod
	let latestPostDate: string | null = null;
	for (const post of posts) {
		const mod = (post.updatedDate ?? post.pubDate)?.toISOString().slice(0, 10) ?? null;
		entries.push({
			loc: `/blog/${post.slug}/`,
			lastmod: mod,
			changefreq: 'monthly',
			priority: 0.7
		});
		if (mod && (!latestPostDate || mod > latestPostDate)) {
			latestPostDate = mod;
		}
	}

	// unique tags
	const seen = new Set<string>();
	for (const post of posts) {
		for (const tag of post.tags) {
			const slug = slugify(tag);
			if (!slug || seen.has(slug)) continue;
			seen.add(slug);
			entries.push({ loc: `/tags/${slug}/`, changefreq: 'weekly', priority: 0.5 });
		}
	}
	if (latestPostDate) {
		entries[0].lastmod = latestPostDate;
	}

	const urls = entries.map((entry) => {
		const items = [
			`<loc>${esc(new URL(entry.loc, site).toString())}</loc>`,
			entry.lastmod ? `<lastmod>${esc(entry.lastmod)}</lastmod>` : '',
			`<changefreq>${entry.changefreq ?? 'monthly'}</changefreq>`,
			`<priority>${entry.priority ?? 0.5}</priority>`
		].filter(Boolean);
		return `<url>${items.join('')}</url>`;
	});

	const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">${urls.join('\n')}</urlset>`;

	return new Response(xml, {
		headers: {
			'content-type': 'application/xml; charset=utf-8',
			'cache-control': 'public, max-age=3600'
		}
	});
}

