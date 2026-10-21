import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// Simple markdown to HTML converter
function markdownToHtml(markdown) {
  let html = markdown;

  // Remove frontmatter
  html = html.replace(/^---\n[\s\S]*?\n---\n/, '');

  // Protect code blocks first: extract, escape HTML, and keep raw code intact
  const codeBlocks = [];
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const langAttr = lang ? ` class="language-${lang}"` : '';
    const escaped = code.trim()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    codeBlocks.push(`<pre><code${langAttr}>${escaped}</code></pre>`);
    return `\nCODEBLOCK${codeBlocks.length - 1}\n`;
  });

  // Protect inline code the same way
  const inlineCodes = [];
  html = html.replace(/`([^`]+)`/g, (_, code) => {
    const escaped = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    inlineCodes.push(`<code>${escaped}</code>`);
    return `INLINECODE${inlineCodes.length - 1}`;
  });

  // Headers
  html = html.replace(/^###### (.*$)/gm, '<h6>$1</h6>');
  html = html.replace(/^##### (.*$)/gm, '<h5>$1</h5>');
  html = html.replace(/^#### (.*$)/gm, '<h4>$1</h4>');
  html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');

  // Bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
  html = html.replace(/_(.+?)_/g, '<em>$1</em>');

  // Strikethrough
  html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />');

  // Blockquotes
  html = html.replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>');

  // Tables
  html = html.replace(/((?:^\|.*\n)+)/gm, (match) => {
    const rows = match.trim().split('\n');
    let table = '<table>';
    rows.forEach((row, i) => {
      const cells = row.split('|').filter((c, idx, arr) => idx > 0 && idx < arr.length - 1).map(c => c.trim());
      if (i === 1 && cells.every(c => /^[-:]+$/.test(c))) return; // Skip separator row
      const tag = i === 0 ? 'th' : 'td';
      table += '<tr>' + cells.map(c => `<${tag}>${c}</${tag}>`).join('') + '</tr>';
    });
    table += '</table>';
    return table;
  });

  // Unordered lists
  html = html.replace(/((?:^[-*+] .*\n?)+)/gm, (match) => {
    const items = match.trim().split('\n').map(line => `<li>${line.replace(/^[-*+] /, '')}</li>`);
    return '<ul>' + items.join('') + '</ul>';
  });

  // Ordered lists
  html = html.replace(/((?:^\d+\. .*\n?)+)/gm, (match) => {
    const items = match.trim().split('\n').map(line => `<li>${line.replace(/^\d+\. /, '')}</li>`);
    return '<ol>' + items.join('') + '</ol>';
  });

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr />');

  // Paragraphs (double newlines)
  html = html.replace(/\n\n/g, '</p><p>');

  // Line breaks
  html = html.replace(/\n/g, '<br />');

  // Wrap in paragraph
  html = '<p>' + html + '</p>';

  // Clean up empty paragraphs
  html = html.replace(/<p><\/p>/g, '');
  html = html.replace(/<p>(<(?:h\d|ul|ol|table|pre|blockquote|hr))/g, '$1');
  html = html.replace(/(<\/(?:h\d|ul|ol|table|pre|blockquote)>)<\/p>/g, '$1');

  // Restore protected code blocks / inline code
  html = html.replace(/CODEBLOCK(\d+)/g, (_, i) => codeBlocks[Number(i)]);
  html = html.replace(/INLINECODE(\d+)/g, (_, i) => inlineCodes[Number(i)]);

  return html;
}

// Parse frontmatter
function parseFrontmatter(content) {
  const match = content.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?/);
  if (!match) return { frontmatter: {}, body: content };

  const frontmatter = {};
  const lines = match[1].split('\n');
  let currentKey = null;
  let currentArray = null;

  for (const line of lines) {
    const arrayMatch = line.match(/^(\s+)-\s+(.+)$/);
    if (arrayMatch && currentKey) {
      if (!currentArray) {
        currentArray = [];
        frontmatter[currentKey] = currentArray;
      }
      currentArray.push(arrayMatch[2].trim());
      continue;
    }

    const kvMatch = line.match(/^(\w+):\s*(.*)$/);
    if (kvMatch) {
      currentKey = kvMatch[1];
      currentArray = null;
      let value = kvMatch[2].trim();
      // Remove quotes
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      frontmatter[currentKey] = value;
    }
  }

  return { frontmatter, body: content.slice(match[0].length) };
}

// Escape XML special characters
function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Collect all blog posts
const blogDir = path.join(rootDir, 'src/content/blog');
const posts = [];

// Read all blog posts from subdirectories
const entries = fs.readdirSync(blogDir, { withFileTypes: true });
for (const entry of entries) {
  if (entry.isDirectory()) {
    const mdPath = path.join(blogDir, entry.name, 'index.md');
    if (fs.existsSync(mdPath)) {
      const content = fs.readFileSync(mdPath, 'utf-8');
      const { frontmatter, body } = parseFrontmatter(content);
      posts.push({ frontmatter, body, filename: entry.name });
    }
  }
}

// Skip the stray root-level markdown file (duplicate of src/content/blog/how-instagram-stores-reels-photos-drafts)
const rootMdPath = null; // path.join(rootDir, 'how-instagram-stores-reels-behind-the-scene.md');
if (rootMdPath && fs.existsSync(rootMdPath)) {
  const content = fs.readFileSync(rootMdPath, 'utf-8');
  const { frontmatter, body } = parseFrontmatter(content);
  // The root file doesn't have frontmatter, so we need to extract title from first heading
  if (!frontmatter.title) {
    const titleMatch = body.match(/^#\s+(.+)$/m);
    frontmatter.title = titleMatch ? titleMatch[1] : 'Untitled';
  }
  if (!frontmatter.pubDate) {
    frontmatter.pubDate = new Date().toISOString().split('T')[0];
  }
  posts.push({ frontmatter, body, filename: 'how-instagram-stores-reels-behind-the-scene' });
}

// Sort by date (newest first)
posts.sort((a, b) => {
  const dateA = new Date(a.frontmatter.pubDate || '2020-01-01');
  const dateB = new Date(b.frontmatter.pubDate || '2020-01-01');
  return dateB - dateA;
});

// Validate and fix dates
for (const post of posts) {
  if (!post.frontmatter.pubDate || isNaN(new Date(post.frontmatter.pubDate))) {
    console.log(`WARNING: Invalid date for "${post.frontmatter.title}": ${post.frontmatter.pubDate}`);
    post.frontmatter.pubDate = '2020-01-01';
  }
}

// Generate Blogger-compatible Atom XML
let xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<feed xmlns="http://www.w3.org/2005/Atom"
      xmlns:blogger="http://schemas.google.com/blogger/2008"
      xmlns:georss="http://www.georss.org/georss"
      xmlns:gd="http://schemas.google.com/g/2005"
      xmlns:thr="http://purl.org/syndication/thread/1.0"
      xmlns:app="http://www.w3.org/2007/app">
  <title type="text">Rhytham Negi</title>
  <subtitle type="text">AI engineering, backend development, systems. // Tech articles on system design, AI, mobile development, and more</subtitle>
  <updated>${new Date().toISOString()}</updated>
`;

for (const post of posts) {
  const title = escapeXml(post.frontmatter.title || 'Untitled');
  const content = markdownToHtml(post.body);
  const pubDate = new Date(post.frontmatter.pubDate || '2020-01-01').toISOString();
  const tags = post.frontmatter.tags || [];
  const entryId = `tag:blogger.com,1999:blog-1.post-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  xml += `  <entry>
    <id>${entryId}</id>
    <title type="text">${title}</title>
    <content type="xhtml"><![CDATA[<div xmlns="http://www.w3.org/1999/xhtml">${content}</div>]]></content>
    <published>${pubDate}</published>
    <updated>${pubDate}</updated>
    <author><name>Rhytham Negi</name></author>
    <category scheme="http://schemas.google.com/g/2005#kind" term="http://schemas.google.com/blogger/2008/kind#post" />
`;

  for (const tag of tags) {
    xml += `    <category scheme="http://www.blogger.com/atom/ns#" term="${escapeXml(tag)}" />\n`;
  }

  xml += `  </entry>\n`;
}

xml += `</feed>`;

// Write the output file
const outputPath = path.join(rootDir, 'blogger-import.xml');
fs.writeFileSync(outputPath, xml, 'utf-8');

console.log(`Successfully converted ${posts.length} blog posts to Blogger-compatible XML.`);
console.log(`Output file: ${outputPath}`);
console.log('\nPosts included:');
for (const post of posts) {
  console.log(`  - ${post.frontmatter.title} (${post.frontmatter.pubDate})`);
}
