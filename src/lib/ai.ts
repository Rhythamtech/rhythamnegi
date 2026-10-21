import { getEnv } from './env';
import { getSetting } from './db';
import { decryptSecret } from './ai-crypto';

/**
 * Minimal OpenAI-compatible chat completion client (server-side only).
 *
 * Works with any provider exposing `POST {baseUrl}/chat/completions` — Groq,
 * OpenAI, OpenRouter, Ollama, LM Studio, vLLM, etc. Uses plain `fetch`, so no
 * SDK dependency is needed. Credentials never leave the server; the browser
 * only talks to our own `/cms/api/ai/assist` endpoint.
 *
 * Configuration is resolved per field: a value saved in the CMS (SQLite
 * `settings`) wins, otherwise the `.env` value is used. The API key is stored
 * encrypted — see src/lib/ai-crypto.ts.
 */

export type AiConfig = {
	baseUrl: string;
	apiKey: string;
	model: string;
};

export type AiConfigSource = 'cms' | 'env';

export type AiConfigStatus = {
	baseUrl: string;
	baseUrlSource: AiConfigSource;
	model: string;
	modelSource: AiConfigSource;
	apiKeySource: 'cms' | 'env' | 'none';
	/** Masked tail of the resolved key — never the full value. */
	apiKeyHint: string;
	/** True when a CMS key exists but cannot be decrypted (secret changed). */
	storedKeyUnreadable: boolean;
};

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_MODEL = 'gpt-4o-mini';

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

function cmsSetting(key: string): string {
	return (getSetting(key) || '').trim();
}

function resolveBaseUrl(): { value: string; source: AiConfigSource } {
	const cms = cmsSetting('ai_base_url');
	if (cms) return { value: cms.replace(/\/+$/, ''), source: 'cms' };
	return {
		value: getEnv('AI_BASE_URL', DEFAULT_BASE_URL).trim().replace(/\/+$/, ''),
		source: 'env'
	};
}

function resolveModel(): { value: string; source: AiConfigSource } {
	const cms = cmsSetting('ai_model');
	if (cms) return { value: cms, source: 'cms' };
	return { value: getEnv('AI_MODEL', DEFAULT_MODEL), source: 'env' };
}

function resolveApiKey(): {
	value: string | null;
	source: 'cms' | 'env' | 'none';
	unreadable: boolean;
} {
	const stored = (getSetting('ai_api_key') || '').trim();
	if (stored) {
		const decrypted = decryptSecret(stored);
		if (decrypted) return { value: decrypted, source: 'cms', unreadable: false };
		const env = getEnv('AI_API_KEY');
		return { value: env || null, source: env ? 'env' : 'none', unreadable: true };
	}
	const env = getEnv('AI_API_KEY');
	return { value: env || null, source: env ? 'env' : 'none', unreadable: false };
}

function maskKey(key: string): string {
	return `••••${key.slice(-4)}`;
}

/** Effective configuration + where each field came from (for the settings UI). */
export function getAiConfigStatus(): AiConfigStatus {
	const baseUrl = resolveBaseUrl();
	const model = resolveModel();
	const apiKey = resolveApiKey();
	return {
		baseUrl: baseUrl.value,
		baseUrlSource: baseUrl.source,
		model: model.value,
		modelSource: model.source,
		apiKeySource: apiKey.source,
		apiKeyHint: apiKey.value ? maskKey(apiKey.value) : '',
		storedKeyUnreadable: apiKey.unreadable
	};
}

export function getAiConfig(): AiConfig | null {
	const apiKey = resolveApiKey();
	if (!apiKey.value) return null;
	const baseUrl = resolveBaseUrl();
	const model = resolveModel();
	return { baseUrl: baseUrl.value, apiKey: apiKey.value, model: model.value };
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
			'AI assist is not configured — add an API key in CMS → AI Assist (or set AI_API_KEY in .env).',
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
			throw new AiError('Could not reach the AI provider. Check the base URL in CMS → AI Assist.', 502);
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
				throw new AiError(
					`AI provider rejected the credentials${hint ? `: ${hint}` : ''}. Check the API key in CMS → AI Assist.`,
					401
				);
			}
			if (res.status === 429) {
				throw new AiError('AI provider rate limit hit — wait a moment and try again.', 429);
			}
			if (res.status === 404) {
				throw new AiError(
					`Model "${cfg.model}" not found at the configured base URL. Check the model in CMS → AI Assist.`,
					404
				);
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
