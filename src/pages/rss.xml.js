import rss from '@astrojs/rss';
import { getDb } from '../lib/db';
import { listPosts } from '../lib/db';
import { getSettings } from '../lib/db';
import { postViews } from '../lib/views';

/**
 * Args:
 *   <APIContext> — framework context (site + settings loaded from SQLite).
 */
export async function GET(context) {
	// Ensure the DB is migrated/initialized before querying.
	getDb();
	const settings = getSettings();
	const posts = postViews(listPosts({ publishedOnly: true }));

	return rss({
		title: settings.site_title,
		description: settings.site_description,
		site: context.site,
		items: posts.map((post) => ({
			title: post.data.title,
			description: post.data.description,
			pubDate: post.data.pubDate ?? undefined,
			link: `/blog/${post.id}/`,
		})),
	});
}
