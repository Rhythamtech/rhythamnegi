import type { APIRoute } from 'astro';
import { AiError, aiChat } from '../../../../../lib/ai';

/**
 * POST /cms/api/ai/config/test
 *
 * Sends a tiny completion using the *saved* configuration so the user can
 * verify base URL, key and model. Returns JSON; never echoes the API key.
 */
export const POST: APIRoute = async () => {
	try {
		const reply = await aiChat(
			[{ role: 'user', content: 'Reply with only the word: ok' }],
			{ maxTokens: 12, temperature: 0, timeoutMs: 15_000 }
		);

		return json({
			ok: true,
			message: 'Connection works.',
			sample: reply.replace(/\s+/g, ' ').slice(0, 120)
		});
	} catch (err) {
		if (err instanceof AiError) {
			const status = err.status >= 400 && err.status <= 599 ? err.status : 502;
			return json({ ok: false, error: err.message }, status);
		}
		console.error('AI connection test failed:', err);
		return json({ ok: false, error: 'Unexpected error while contacting the provider.' }, 500);
	}
};

function json(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
	});
}
