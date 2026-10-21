import type { APIRoute } from 'astro';
import { getDb } from '../../../../../lib/db';

export const POST: APIRoute = async (context) => {
	try {
		const db = getDb();
		const next = Number(
			(db.prepare('SELECT COALESCE(MAX(ord), -1) AS max FROM about_skills').get() as any).max
		) + 1;
		db.prepare('INSERT INTO about_skills (heading, items, ord) VALUES (?, ?, ?)')
			.run('New category', '', next);
		return context.redirect('/cms/about?saved=1', 303);
	} catch (err) {
		console.error('Adding skill failed:', err);
		return context.redirect('/cms/about?error=1', 303);
	}
};
