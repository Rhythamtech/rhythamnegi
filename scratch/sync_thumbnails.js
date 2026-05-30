import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const contentDir = path.join(__dirname, '../src/content/');
const thumbnailsDir = path.join(__dirname, '../src/assets/thumbnails/');

const colors = [
  ['#e0f7fa', '#80deea'],
  ['#f5f7fa', '#c3cfe2'],
  ['#fdfbfb', '#ebedee'],
  ['#fff1eb', '#ace0f9'],
  ['#f6d365', '#fda085'],
  ['#a1c4fd', '#c2e9fb'],
  ['#d4fc79', '#96e6a1'],
  ['#84fab0', '#8fd3f4'],
  ['#cfd9df', '#e2ebf0'],
  ['#a6c0fe', '#f68084'],
  ['#fccb90', '#d57eeb'],
  ['#e0c3fc', '#8ec5fc'],
  ['#f093fb', '#f5576c'],
  ['#4facfe', '#00f2fe'],
  ['#43e97b', '#38f9d7'],
  ['#fa709a', '#fee140'],
  ['#667eea', '#764ba2'],
  ['#ff9a9e', '#fecfef'],
  ['#96fbc4', '#f9f586'],
];

function getDeterministicColors(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

function generateSvg(name, itemColors) {
  const svgContent = `<svg width="1280" height="720" viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${itemColors[0]};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${itemColors[1]};stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="1280" height="720" fill="url(#grad)" />
</svg>`;

  if (!fs.existsSync(thumbnailsDir)) {
    fs.mkdirSync(thumbnailsDir, { recursive: true });
  }

  fs.writeFileSync(path.join(thumbnailsDir, `${name}.svg`), svgContent);
  console.log(`Generated thumbnail: ${name}.svg`);
}

function processContent(collection) {
  const collectionPath = path.join(contentDir, collection);
  if (!fs.existsSync(collectionPath)) return;

  const entries = fs.readdirSync(collectionPath);
  entries.forEach(entry => {
    const entryPath = path.join(collectionPath, entry);
    if (!fs.statSync(entryPath).isDirectory()) return;

    const mdPath = path.join(entryPath, 'index.md');
    if (!fs.existsSync(mdPath)) return;

    const slug = entry;
    const thumbnailPath = path.join(thumbnailsDir, `${slug}.svg`);

    // 1. Ensure SVG exists
    if (!fs.existsSync(thumbnailPath)) {
      const itemColors = getDeterministicColors(slug);
      generateSvg(slug, itemColors);
    }

    // 2. Ensure frontmatter has coverImage
    let content = fs.readFileSync(mdPath, 'utf8');
    const frontmatterMatch = content.match(/^---([\s\S]*?)---/);
    
    if (frontmatterMatch) {
      let frontmatter = frontmatterMatch[1];
      if (!frontmatter.includes('coverImage:')) {
        // Add coverImage
        const relativeThumbnailPath = `../../../assets/thumbnails/${slug}.svg`;
        const newFrontmatter = frontmatter.trim() + `\ncoverImage: "${relativeThumbnailPath}"\n`;
        content = content.replace(/^---([\s\S]*?)---/, `--- \n${newFrontmatter}---`);
        fs.writeFileSync(mdPath, content);
        console.log(`Updated frontmatter for: ${slug}`);
      }
    }
  });
}

processContent('blog');
processContent('projects');
