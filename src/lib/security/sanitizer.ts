import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitizes HTML content using DOMPurify.
 * Used to clean incoming/outgoing email HTML to prevent XSS.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return "";
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
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
    ],
    ALLOWED_ATTR: [
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
    ],
    ALLOW_UNKNOWN_PROTOCOLS: false,
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|cid):|[^a-z0-9+.-])/i, // block javascript: URIs
  }) as string;
}
