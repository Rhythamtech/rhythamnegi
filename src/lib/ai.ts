import { getEnv } from './env';

/**
 * Minimal OpenAI-compatible chat completion client (server-side only).
 *
 * Works with any provider exposing `POST {baseUrl}/chat/completions` — Groq,
 * OpenAI, OpenRouter, Ollama, LM Studio, vLLM, etc. Uses plain `fetch`, so no
 * SDK dependency is needed. Credentials never leave the server; the browser
 * only talks to our own `/cms/api/ai/assist` endpoint.
 */

export type AiConfig = {
	baseUrl: string;
	apiKey: string;
	model: string;
};

export type ChatMessage = {
	role: 'system' | 'user' | 'assistant';
	content: string;
};

export class AiError extends Error {
	constructor(
		message: string,
		readonly status: number = 500
	) {
		super(message);
	}
}

export function getAiConfig(): AiConfig | null {
	const apiKey = getEnv('AI_API_KEY');
	if (!apiKey) return null;
	return {
		baseUrl: getEnv('AI_BASE_URL', 'https://api.openai.com/v1').replace(/\/+$/, ''),
		apiKey,
		model: getEnv('AI_MODEL', 'gpt-4o-mini')
	};
}

type AiChatOptions = {
	temperature?: number;
	maxTokens?: number;
	timeoutMs?: number;
};

export async function aiChat(
	messages: ChatMessage[],
	options: AiChatOptions = {}
): Promise<string> {
	const cfg = getAiConfig();
	if (!cfg) {
		throw new AiError(
			'AI assist is not configured — set AI_BASE_URL, AI_API_KEY and AI_MODEL in .env (see .env.example)',
			503
		);
	}

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 30_000);

	try {
		let res: Response;
		try {
			res = await fetch(`${cfg.baseUrl}/chat/completions`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${cfg.apiKey}`
				},
				body: JSON.stringify({
					model: cfg.model,
					messages,
					temperature: options.temperature ?? 0.3,
					max_tokens: options.maxTokens,
					stream: false
				}),
				signal: controller.signal
			});
		} catch (err) {
			if (controller.signal.aborted) {
				throw new AiError('The AI request took too long — please try again.', 504);
			}
			throw new AiError('Could not reach the AI provider. Check AI_BASE_URL in .env.', 502);
		}

		if (!res.ok) {
			let hint = '';
			try {
				const data = await res.json();
				hint = String(data?.error?.message || data?.error || '');
			} catch {
				// Non-JSON error body — fall back to the status code below.
			}
			if (res.status === 401 || res.status === 403) {
				throw new AiError(`AI provider rejected the credentials${hint ? `: ${hint}` : ''}. Check AI_API_KEY.`, 401);
			}
			if (res.status === 429) {
				throw new AiError('AI provider rate limit hit — wait a moment and try again.', 429);
			}
			if (res.status === 404) {
				throw new AiError(`Model "${cfg.model}" not found at AI_BASE_URL. Check AI_MODEL in .env.`, 404);
			}
			throw new AiError(hint || `AI provider error (${res.status}).`, res.status);
		}

		const data = await res.json();
		const content = data?.choices?.[0]?.message?.content;
		if (typeof content !== 'string' || !content.trim()) {
			throw new AiError('The AI returned an empty response — please try again.', 502);
		}
		return content;
	} finally {
		clearTimeout(timer);
	}
}

/**
 * Models often wrap answers in ```text … ``` / ```markdown … ``` fences even
 * when the prompt asks for raw output. Strip a single outer fence if present.
 */
export function stripCodeFences(text: string): string {
	const trimmed = text.trim();
	const match = trimmed.match(/^```[a-zA-Z0-9_-]*\s*\n([\s\S]*?)\n?```$/);
	return match ? match[1].trim() : trimmed;
}
