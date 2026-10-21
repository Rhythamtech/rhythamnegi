import type { APIRoute } from 'astro';
import { putSetting } from '../../../../lib/db';
import { encryptSecret } from '../../../../lib/ai-crypto';

/**
 * POST /cms/api/ai/config
 *
 * Save the OpenAI-compatible provider settings. Blank fields fall back to the
 * corresponding `.env` value; the API key is encrypted before it is stored and
 * is never sent back to the browser.
 *
 * Auth + same-origin CSRF protection are enforced by the global middleware.
 */
export const POST: APIRoute = async (context) => {
	const form = await context.request.formData();

	const baseUrlRaw = String(form.get('base_url') || '').trim();
	const model = String(form.get('model') || '').trim();
	const apiKey = String(form.get('api_key') || '').trim();
	const clearKey = String(form.get('clear_key') || '') === '1';

	const baseUrl = normalizeBaseUrl(baseUrlRaw);
	if (!baseUrl.ok) {
		return context.redirect('/cms/ai?error=base_url', 303);
	}
	if (model.length > 200) {
		return context.redirect('/cms/ai?error=model', 303);
	}
	if (apiKey.length > 4000) {
		return context.redirect('/cms/ai?error=key', 303);
	}

	putSetting('ai_base_url', baseUrl.value);
	putSetting('ai_model', model);

	if (clearKey) {
		putSetting('ai_api_key', '');
	} else if (apiKey) {
		putSetting('ai_api_key', encryptSecret(apiKey));
	}
	// A blank key field with clearKey=false keeps the currently stored key.

	return context.redirect('/cms/ai?saved=1', 303);
};

type UrlCheck = { ok: true; value: string } | { ok: false };

function normalizeBaseUrl(raw: string): UrlCheck {
	if (!raw) return { ok: true, value: '' };
	if (raw.length > 2048) return { ok: false };

	let url: URL;
	try {
		url = new URL(raw);
	} catch {
		return { ok: false };
	}

	if (url.protocol !== 'https:' && url.protocol !== 'http:') return { ok: false };
	// Plain HTTP would leak the API key — allow it only for local/LAN providers
	// such as Ollama or LM Studio.
	if (url.protocol === 'http:' && !isLocalHost(url.hostname)) return { ok: false };

	return { ok: true, value: url.toString().replace(/\/+$/, '') };
}

function isLocalHost(hostname: string): boolean {
	const host = hostname.toLowerCase();
	if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]') {
		return true;
	}
	if (host.endsWith('.local')) return true;
	return (
		/^10\./.test(host) ||
		/^192\.168\./.test(host) ||
		/^172\.(1[6-9]|2\d|3[01])\./.test(host)
	);
}
