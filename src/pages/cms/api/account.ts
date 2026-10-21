import type { APIRoute } from 'astro';
import { changeCredentials } from '../../../lib/auth';
import { startSession } from '../../../lib/session';

export const POST: APIRoute = async (context) => {
	const form = await context.request.formData();

	const currentPassword = String(form.get('current_password') || '');
	const username = String(form.get('username') || '').trim();
	const newPassword = String(form.get('new_password') || '');
	const confirmPassword = String(form.get('confirm_password') || '');

	if (newPassword && newPassword !== confirmPassword) {
		return context.redirect('/cms/account?error=confirm', 303);
	}

	const result = changeCredentials({
		currentPassword,
		username,
		newPassword: newPassword || undefined
	});

	if (!result.ok) {
		return context.redirect(`/cms/account?error=${result.error}`, 303);
	}

	// Issue a fresh token under the new username for this browser. Sessions are
	// stateless, so tokens already held by other devices stay valid until expiry.
	startSession(context, result.username);

	return context.redirect('/cms/account?saved=1', 303);
};

export const GET: APIRoute = async (context) => context.redirect('/cms/account', 303);
