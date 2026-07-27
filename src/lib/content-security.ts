import sanitizeHtml from "sanitize-html";

const commonOptions: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "strong", "em", "u", "s", "blockquote", "ul", "ol", "li",
    "h2", "h3", "h4", "code", "pre", "a", "img", "table", "thead", "tbody",
    "tr", "th", "td", "hr", "span",
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title", "width", "height"],
    span: ["class"],
    code: ["class"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: { img: ["http", "https", "data"] },
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer nofollow" }),
  },
};

export function sanitizeRichText(value: string): string {
  return sanitizeHtml(value, commonOptions);
}

export function sanitizePlainText(value: string): string {
  return sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }).trim();
}
