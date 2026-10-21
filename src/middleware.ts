import { defineMiddleware } from 'astro:middleware';
import { getSessionFromContext } from './lib/session';
import { getDb, pruneSessions } from './lib/db';

const CMS_PUBLIC_PATHS = new Set(['/cms/login', '/cms/api/login', '/cms/api/logout']);

/**
 * Global middleware:
 *  1. Initializes the SQLite database up front and occasionally drops expired sessions.
 *  2. Protects the whole /cms area with a session cookie (except the login
 *     page and the login/logout API endpoints).
 *  3. Same-origin (CSRF) check for POST requests under /cms.
 */
export const onRequest = defineMiddleware((context, next) => {
	const normalized = context.url.pathname.replace(/\/+$/, '') || '/';

	if (normalized === '/cms' || normalized.startsWith('/cms/') || normalized.startsWith('/media')) {
		// Make sure the database is ready before serving CMS/media traffic.
		getDb();
	}

	if (normalized === '/cms' || normalized.startsWith('/cms/')) {
		const path = normalized === '/cms' ? '/cms' : normalized;
		if (!CMS_PUBLIC_PATHS.has(path) && !getSessionFromContext(context)) {
			const forwardedOrigin = originFromHeaders(context.request);
			const base = forwardedOrigin || context.url.origin;
			const loginUrl = new URL('/cms/login', base);
			return context.redirect(loginUrl.toString(), 302);
		}

		if (context.request.method === 'POST' && !CMS_PUBLIC_PATHS.has(path) && !isSameOrigin(context)) {
			return new Response('Forbidden — cross-origin request rejected', { status: 403 });
		}

		if (Math.floor(Math.random() * 50) === 0) {
			pruneSessions();
		}
	}

	return next();
});

function isSameOrigin(context: { request: Request; url: URL }): boolean {
	const origin = context.request.headers.get('origin');
	if (!origin) return false;
	const forwarded = originFromHeaders(context.request);
	return origin === context.url.origin || (forwarded !== '' && origin === forwarded);
}

function originFromHeaders(request: Request): string {
	const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
	if (!host || typeof host !== 'string') return '';
	const proto = (request.headers.get('x-forwarded-proto') || 'http').split(',')[0].trim().toLowerCase();
	return `${proto}://${host}`;
}
