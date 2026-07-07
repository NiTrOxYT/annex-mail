import xss, { FilterXSS, escapeAttrValue } from "xss";

const allowedTags = [
  "a",
  "b",
  "i",
  "em",
  "strong",
  "p",
  "br",
  "div",
  "span",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "img",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "blockquote",
  "pre",
  "code",
  "font",
  "hr",
];

const allowedAttributes = [
  "href",
  "src",
  "alt",
  "title",
  "class",
  "style",
  "id",
  "target",
  "width",
  "height",
  "align",
  "valign",
  "color",
  "face",
  "size",
];

const customWhiteList: Record<string, string[]> = {};
for (const tag of allowedTags) {
  customWhiteList[tag] = allowedAttributes;
}

const filter = new FilterXSS({
  whiteList: customWhiteList,
  onTagAttr: (tag: string, name: string, value: string) => {
    // Check href and src attributes for protocol safety
    if (name === "src" || name === "href") {
      const trimmed = value.trim();
      // Allow safe protocols (http, https, mailto, cid) or relative links (no protocol)
      if (
        /^(?:https?|mailto|cid):/i.test(trimmed) ||
        !/^[a-z0-9+.-]+:/i.test(trimmed)
      ) {
        return `${name}="${escapeAttrValue(value)}"`;
      }
      // If it doesn'\''t match safe protocols, return empty value to strip active scripts
      return `${name}=""`;
    }
    // Return undefined to fall back to default behavior for all other attributes
    return undefined;
  },
});

/**
 * Sanitizes HTML content using server-safe xss package.
 * Has absolutely zero dependencies on jsdom / DOMParser.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return "";
  return filter.process(html);
}
export { xss };
