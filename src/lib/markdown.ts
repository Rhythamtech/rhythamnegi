import { createMarkdownProcessor, type MarkdownProcessor } from '@astrojs/markdown-remark';
import { remarkBeautifulMermaid } from '../plugins/remark-beautiful-mermaid.mjs';
import { autoNewTabExternalLinks } from '../autoNewTabExternalLinks';
import { siteHost } from './env';

/**
 * Renders markdown stored in SQLite with the exact same pipeline the site
 * used for markdown files before the CMS: GFM + Shiki highlighting +
 * the beautiful-mermaid remark plugin + external-link auto new tab.
 *
 * A single processor instance is created lazily and reused for every request
 * (creating one is expensive; rendering is cheap).
 */

let _processor: MarkdownProcessor | null = null;
let _processorPromise: Promise<MarkdownProcessor> | null = null;

export type RenderedMarkdown = {
	html: string;
	headings: Array<{ depth: number; slug: string; text: string }>;
};

export function getMarkdownProcessor(): Promise<MarkdownProcessor> {
	if (_processor) return Promise.resolve(_processor);
	_processorPromise ??= createMarkdownProcessor({
		gfm: true,
		smartypants: true,
		syntaxHighlight: 'shiki',
		remarkPlugins: [remarkBeautifulMermaid],
		rehypePlugins: [
			[autoNewTabExternalLinks, { domain: siteHost() }]
		]
	}).then((processor) => {
		_processor = processor;
		return processor;
	});
	return _processorPromise;
}

export async function renderMarkdown(markdown: string): Promise<RenderedMarkdown> {
	const processor = await getMarkdownProcessor();
	const { code, metadata } = await processor.render(markdown);
	return {
		html: code,
		headings: metadata.headings ?? []
	};
}

/** Render markdown to HTML without heading metadata (small snippets). */
export async function renderMarkdownInline(markdown: string): Promise<string> {
	const { html } = await renderMarkdown(markdown);
	return html;
}
