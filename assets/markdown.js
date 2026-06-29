/* =============================================================
 * Minimal Markdown renderer (no dependencies)
 * Supports: headings, bold, italic, code, code blocks, links,
 * images, lists (ul/ol), blockquote, hr, inline code, paragraphs.
 * Escapes HTML to prevent XSS.
 * ============================================================= */

(function (global) {
  "use strict";

  const escapeHtml = (str) =>
    str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const renderInline = (text) => {
    let out = escapeHtml(text);
    // Inline code (do first to protect contents)
    out = out.replace(/`([^`]+)`/g, (m, p1) => `<code>${p1}</code>`);
    // Images: ![alt](url)
    out = out.replace(
      /!\[([^\]]*)\]\(([^)\s]+)\)/g,
      '<img src="$2" alt="$1" />'
    );
    // Links: [text](url)
    out = out.replace(
      /\[([^\]]+)\]\(([^)\s]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
    );
    // Bold: **text** or __text__
    out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    out = out.replace(/__([^_]+)__/g, "<strong>$1</strong>");
    // Italic: *text* or _text_
    out = out.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    out = out.replace(/_([^_]+)_/g, "<em>$1</em>");
    // Strikethrough: ~~text~~
    out = out.replace(/~~([^~]+)~~/g, "<del>$1</del>");
    return out;
  };

  const renderMarkdown = (src) => {
    if (!src) return "";
    const lines = src.split(/\r?\n/);
    const out = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Code block ```
      if (/^```/.test(line.trim())) {
        const lang = line.trim().slice(3).trim();
        const buf = [];
        i++;
        while (i < lines.length && !/^```/.test(lines[i].trim())) {
          buf.push(lines[i]);
          i++;
        }
        i++; // skip closing ```
        out.push(
          `<pre><code class="language-${escapeHtml(lang)}">${escapeHtml(
            buf.join("\n")
          )}</code></pre>`
        );
        continue;
      }

      // Horizontal rule
      if (/^(\s*[-*_]){3,}\s*$/.test(line)) {
        out.push("<hr />");
        i++;
        continue;
      }

      // Headings
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        out.push(`<h${level}>${renderInline(headingMatch[2])}</h${level}>`);
        i++;
        continue;
      }

      // Blockquote
      if (/^>\s?/.test(line)) {
        const buf = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) {
          buf.push(lines[i].replace(/^>\s?/, ""));
          i++;
        }
        out.push(`<blockquote>${renderInline(buf.join(" "))}</blockquote>`);
        continue;
      }

      // Unordered list
      if (/^\s*[-*+]\s+/.test(line)) {
        const items = [];
        while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
          items.push(`<li>${renderInline(lines[i].replace(/^\s*[-*+]\s+/, ""))}</li>`);
          i++;
        }
        out.push(`<ul>${items.join("")}</ul>`);
        continue;
      }

      // Ordered list
      if (/^\s*\d+\.\s+/.test(line)) {
        const items = [];
        while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
          items.push(`<li>${renderInline(lines[i].replace(/^\s*\d+\.\s+/, ""))}</li>`);
          i++;
        }
        out.push(`<ol>${items.join("")}</ol>`);
        continue;
      }

      // Empty line
      if (line.trim() === "") {
        i++;
        continue;
      }

      // Paragraph (consume consecutive non-empty lines)
      const buf = [line];
      i++;
      while (
        i < lines.length &&
        lines[i].trim() !== "" &&
        !/^(#{1,6})\s+/.test(lines[i]) &&
        !/^```/.test(lines[i].trim()) &&
        !/^\s*[-*+]\s+/.test(lines[i]) &&
        !/^\s*\d+\.\s+/.test(lines[i]) &&
        !/^>\s?/.test(lines[i]) &&
        !/^(\s*[-*_]){3,}\s*$/.test(lines[i])
      ) {
        buf.push(lines[i]);
        i++;
      }
      out.push(`<p>${renderInline(buf.join(" "))}</p>`);
    }

    return out.join("\n");
  };

  global.Markdown = { render: renderMarkdown };
})(window);
