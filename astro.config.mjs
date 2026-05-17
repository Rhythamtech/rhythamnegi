import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwind from "@astrojs/tailwind";
import { autoNewTabExternalLinks } from './src/autoNewTabExternalLinks';
import { remarkBeautifulMermaid } from './src/plugins/remark-beautiful-mermaid.mjs';

import partytown from "@astrojs/partytown";

// https://astro.build/config
export default defineConfig({
  site: 'https://rhythamnegi.com',
  integrations: [mdx(), sitemap(), tailwind(), partytown()],
  markdown: {
    // For Astro 5.5+ / 6
    syntaxHighlight: {
      type: 'shiki',
      // We still exclude mermaid so we can render it ourselves
      excludeLangs: ['mermaid'],
    },
    extendDefaultPlugins: true,
    remarkPlugins: [remarkBeautifulMermaid],
    rehypePlugins: [
      [autoNewTabExternalLinks, {
        domain: 'localhost:4321'
      }]
    ]
  }
});