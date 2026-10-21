import { defineConfig } from 'astro/config';
import tailwind from "@astrojs/tailwind";
import node from '@astrojs/node';
import react from '@astrojs/react';

import partytown from "@astrojs/partytown";

// https://astro.build/config
export default defineConfig({
  site: 'https://rhythamnegi.com',
  // The site (and the CMS dashboard at /cms) renders content from SQLite at request time.
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [react(), tailwind(), partytown()]
});