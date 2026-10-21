import type { APIRoute } from 'astro';
import { checkCredentials, credentialsConfigured } from '../../../lib/auth';
import {
	clientIsRateLimited,
	noteLoginFailure,
	resetLoginFailures,
	startSession
} from '../../../lib/session';
import { pruneSessions } from '../../../lib/db';

export const POST: APIRoute = async (context) => {
	if (!credentialsConfigured()) {
		return context.redirect('/cms/login?error=config', 303);
	}

	const ip =
		context.request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
		context.clientAddress ||
		'unknown';

	if (clientIsRateLimited(ip)) {
		return context.redirect('/cms/login?error=rate', 303);
	}

	const form = await context.request.formData();
	const username = String(form.get('username') || '');
	const password = String(form.get('password') || '');

	if (checkCredentials(username, password)) {
		resetLoginFailures(ip);
		startSession(context, username);
		return context.redirect('/cms', 303);
	}

	noteLoginFailure(ip);
	return context.redirect('/cms/login?error=1', 303);
};
