import type { APIRoute } from 'astro';
import {
	AI_ASSIST_SYSTEM_PROMPT,
	AI_ASSIST_TASK_OPTIONS,
	AI_ASSIST_TASK_PROMPTS,
	AI_MAX_BODY_CHARS,
	type AiAssistTask
} from '../../../../consts';
import { AiError, aiChat, stripCodeFences } from '../../../../lib/ai';
import { listExistingTags } from '../../../../lib/db';
import { slugify } from '../../../../utils';

function jsonResponse(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}

function truncate(text: string, max: number): string {
	const trimmed = text.trim();
	if (trimmed.length <= max) return trimmed;
	return `${trimmed.slice(0, max)}\n… [truncated]`;
}

/**
 * POST /cms/api/ai/assist
 *
 * AI-assisted post metadata + content generation for the CMS editor.
 * Body (JSON): { task, title, description, body }
 * Returns JSON: { ok: true, task, result } | { ok: false, error }
 *
 * Auth is enforced by the global middleware (CMS session + same-origin CSRF).
 */
export const POST: APIRoute = async (context) => {
	let payload: Record<string, unknown>;
	try {
		payload = await context.request.json();
	} catch {
		return jsonResponse({ ok: false, error: 'Invalid request body.' }, 400);
	}

	const task = String(payload.task || '') as AiAssistTask;
	const template = AI_ASSIST_TASK_PROMPTS[task];
	if (!template) {
		return jsonResponse({ ok: false, error: 'Unknown AI task.' }, 400);
	}

	const title = truncate(String(payload.title || ''), 200);
	const description = truncate(String(payload.description || ''), 500);
	const body = truncate(String(payload.body || ''), AI_MAX_BODY_CHARS);

	// For tag suggestions: prefer reusing the tags that already exist on this blog.
	const existingTags = task === 'tags' ? listExistingTags() : [];

	if (!title && !body) {
		return jsonResponse(
			{ ok: false, error: 'Add a title or some content first, then run AI assist.' },
			400
		);
	}

	const options = AI_ASSIST_TASK_OPTIONS[task];
	const userPrompt = template
		.replaceAll('{title}', title || '(no title yet)')
		.replaceAll('{description}', description || '(none)')
		.replaceAll('{body}', body || '(not written yet)')
		.replaceAll(
			'{existing_tags}',
			existingTags.length ? existingTags.join(', ') : '(none yet — the blog has no tags)'
		);

	try {
		const raw = await aiChat(
			[
				{ role: 'system', content: AI_ASSIST_SYSTEM_PROMPT },
				{ role: 'user', content: userPrompt }
			],
			{ temperature: options.temperature, maxTokens: options.maxTokens }
		);

		let result = stripCodeFences(raw);
		let extra: Record<string, unknown> = {};
		if (task === 'slug') {
			// Normalize whatever the model produced to a safe slug.
			result = slugify(result.replace(/`/g, ''));
		}
		if (task === 'tags') {
			// Clean each tag, dedupe case-insensitively, snap casing to existing
			// tags, and report which suggestions are genuinely new.
			const existingLower = new Map(existingTags.map((t) => [t.toLowerCase(), t]));
			const seen = new Set<string>();
			const tags: string[] = [];
			const fresh: string[] = [];
			for (const rawTag of result.split(',')) {
				const tag = rawTag.trim().replace(/\s+/g, ' ').replace(/^#+/, '');
				if (!tag) continue;
				const key = tag.toLowerCase();
				if (seen.has(key)) continue;
				seen.add(key);
				const aligned = existingLower.get(key);
				if (aligned) {
					tags.push(aligned);
				} else {
					tags.push(tag);
					fresh.push(tag);
				}
			}
			result = tags.join(', ');
			extra = { newTags: fresh, existingTags };
		}
		if (result) {
			return jsonResponse({ ok: true, task, result, ...extra });
		}
		return jsonResponse({ ok: false, error: 'The AI returned an empty response — please try again.' }, 502);
	} catch (err) {
		if (err instanceof AiError) {
			return jsonResponse({ ok: false, error: err.message }, err.status);
		}
		console.error('AI assist failed:', err);
		return jsonResponse({ ok: false, error: 'Something went wrong with the AI request — please try again.' }, 500);
	}
};
