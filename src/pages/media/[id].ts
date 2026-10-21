import type { APIRoute } from 'astro';
import { getMedia } from '../../lib/db';

/**
 * Serves media stored as BLOBs in SQLite.
 * URL pattern: /media/{id} (e.g. /media/1) — extension mirrors the mime type
 * stored in the database so the browser and crawlers get the right format.
 */
export const GET: APIRoute = async ({ params, request }) => {
	const raw = String(params.id ?? '');
	const id = Number.parseInt(raw, 10);
	if (!Number.isFinite(id) || id <= 0) {
		return new Response('Not found', { status: 404 });
	}

	const media = getMedia(id);
	if (!media || !media.data) {
		return new Response('Not found', { status: 404 });
	}

	const etag = JSON.stringify(media.hash);
	if (request.headers.get('if-none-match') === etag) {
		return new Response(null, {
			status: 304,
			headers: {
				etag,
				'cache-control': 'public, max-age=31536000, immutable'
			}
		});
	}

	return new Response(media.data as unknown as BodyInit, {
		headers: {
			'content-type': media.mime,
			'content-length': String(media.data.byteLength),
			'cache-control': 'public, max-age=31536000, immutable',
			etag,
			'x-content-type-options': 'nosniff'
		}
	});
};
