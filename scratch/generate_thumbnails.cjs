import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const thumbnailsDir = path.join(__dirname, '../src/assets/thumbnails/');

const items = [
  { name: 'building-rag-from-scratch-using-langchain-python', colors: ['#e0f7fa', '#80deea'] },
  { name: 'how-llms-works-under-the-hood', colors: ['#f5f7fa', '#c3cfe2'] },
  { name: 'llm-with-data-privacy', colors: ['#fdfbfb', '#ebedee'] },
  { name: 'understanding-reacts-virtual-dom-a-deep-dive', colors: ['#fff1eb', '#ace0f9'] },
  { name: 'which-python-framework-should-i-choose-fastapi-vs-django', colors: ['#f6d365', '#fda085'] },
  { name: 'ai-resume-editor', colors: ['#a1c4fd', '#c2e9fb'] },
  { name: 'dockg', colors: ['#d4fc79', '#96e6a1'] },
  { name: 'sqlwise-ai-agent', colors: ['#84fab0', '#8fd3f4'] }
];

items.forEach(item => {
  const svgContent = `<svg width="1280" height="720" viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${item.colors[0]};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${item.colors[1]};stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="1280" height="720" fill="url(#grad)" />
</svg>`;

  fs.writeFileSync(path.join(thumbnailsDir, `${item.name}.svg`), svgContent);
  console.log(`Created ${item.name}.svg`);
});
