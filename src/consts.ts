// Place any global data in this file.
// You can import this data from anywhere in your site by using the `import` keyword.

export const SITE_TITLE = 'Rhytham Negi';
export const SITE_TAGLINE = 'Innovative AI Engineer'; // site tagline
export const SITE_DESCRIPTION = 'Innovative AI Engineer with 4 years of experience enhancing media products through advanced AI technologies.'; // site meta description for SEO

// ---------------------------------------------------------------------------
// Gen AI assist (CMS post editor)
// Prompts for the OpenAI-compatible assistant behind /cms/api/ai/assist.
// ---------------------------------------------------------------------------

/** Max characters of the post body sent to the AI provider (cost/latency guard). */
export const AI_MAX_BODY_CHARS = 8000;

export const AI_ASSIST_SYSTEM_PROMPT =
	'You are a concise writing assistant embedded in a personal developer-blog CMS. ' +
	'Respond with ONLY the requested content — no preamble, no explanations, no quotes around it, ' +
	'and no markdown code fences unless asked for a full markdown document.';

export type AiAssistTask = 'slug' | 'description' | 'seo_title' | 'tags' | 'draft' | 'rewrite';

/** Prompt templates per task. `{title}`, `{description}` and `{body}` are placeholders. */
export const AI_ASSIST_TASK_PROMPTS: Record<AiAssistTask, string> = {
	slug:
		'Create the best URL slug for this blog post: "{title}".\n' +
		'Reply with only the slug: lowercase, hyphen-separated, max 6-8 meaningful words, no dates, no stop words, no trailing hyphen.',
	description:
		'Write a SEO meta description for this blog post.\n' +
		'Title: "{title}"\nCurrent draft description: {description}\nPost content:\n{body}\n' +
		'Requirements: 1-2 sentences, max 160 characters, plain text, engaging and specific. Reply with only the description.',
	seo_title:
		'Optimize this blog post title for search engines while keeping it natural and compelling.\n' +
		'Title: "{title}"\nContent:\n{body}\n' +
		'Requirements: max 60 characters, keep the core topic, add power/keyword words if useful. Reply with only the optimized title.',
	tags:
		'Suggest 3-5 comma-separated tags for this blog post.\n' +
		'Title: "{title}"\nContent:\n{body}\n' +
		'Existing tags already used on this blog (in order of how often they are used): {existing_tags}\n' +
		'Rules: FIRST reuse existing tags exactly as written (matching name, casing included) whenever they fit the post. ' +
		'Only introduce a new tag when no existing tag aligns well with the topic; keep new tags short and lowercase. ' +
		'Reply with only the tags on one line, comma-separated, no "#" prefix, no numbering.',
	draft:
		'Write a complete markdown draft of a blog post for this title: "{title}".\n' +
		'Author intent / notes: {description}\n' +
		'Requirements: start with one engaging paragraph (no title heading at the top), use ' +
		'`##` section headings, short paragraphs, occasional bullet lists; technical developer-blog tone. ' +
		'Reply with only the markdown document.',
	rewrite:
		'Improve the grammar, flow and structure of this markdown blog post without changing its meaning, voice or facts.\n' +
		'Title: "{title}"\nContent:\n{body}\n' +
		'Rules: never rewrite or remove fenced code blocks and ```mermaid diagrams; keep existing headings and lists; ' +
		'reply with the full improved markdown document.'
};

/** Per-task completion settings: [temperature, max_tokens]. Meta vs long-form. */
export const AI_ASSIST_TASK_OPTIONS: Record<AiAssistTask, { temperature: number; maxTokens: number }> = {
	slug: { temperature: 0.1, maxTokens: 60 },
	description: { temperature: 0.4, maxTokens: 120 },
	seo_title: { temperature: 0.4, maxTokens: 60 },
	tags: { temperature: 0.2, maxTokens: 60 },
	draft: { temperature: 0.7, maxTokens: 3000 },
	rewrite: { temperature: 0.4, maxTokens: 4000 }
};
