import type { APIRoute } from 'astro';
import { endSession } from '../../../lib/session';

export const POST: APIRoute = async (context) => {
	endSession(context);
	return context.redirect('/cms/login', 303);
};
