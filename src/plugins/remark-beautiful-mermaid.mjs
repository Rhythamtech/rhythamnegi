import { visit } from 'unist-util-visit';
import { renderMermaidSVG } from 'beautiful-mermaid';

export function remarkBeautifulMermaid(options = {}) {
  return (tree) => {
    visit(tree, 'code', (node) => {
      if (node.lang === 'mermaid') {
        try {
          // Use CSS variables for colors to support light/dark mode
          const svg = renderMermaidSVG(node.value, {
            bg: 'transparent',
            fg: 'var(--mermaid-fg, #e6edf3)',
            line: 'var(--mermaid-line, #3d444d)',
            accent: 'var(--mermaid-accent, #4493f8)',
            muted: 'var(--mermaid-muted, #9198a1)',
            ...options
          });

          node.type = 'html';
          node.value = `<div class="mermaid-diagram flex justify-center my-6">${svg}</div>`;
        } catch (error) {
          console.error('Mermaid rendering failed:', error);
        }
      }
    });
  };
}
