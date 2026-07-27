import { describe, expect, it } from "vitest";
import { sanitizePlainText, sanitizeRichText } from "../../src/lib/content-security";

describe("content sanitization", () => {
  it("removes executable markup and unsafe URL schemes", () => {
    const clean = sanitizeRichText(
      '<p onclick="steal()">Aman</p><script>alert(1)</script><a href="javascript:alert(2)">tautan</a>',
    );

    expect(clean).toContain("<p>Aman</p>");
    expect(clean).not.toContain("onclick");
    expect(clean).not.toContain("script");
    expect(clean).not.toContain("javascript:");
  });

  it("adds defensive rel attributes to links", () => {
    const clean = sanitizeRichText('<a href="https://example.com" target="_blank">Sumber</a>');
    expect(clean).toContain('rel="noopener noreferrer nofollow"');
  });

  it("converts rich content into trimmed plain text", () => {
    expect(sanitizePlainText("  <strong>Judul</strong> &amp; isi  ")).toBe("Judul &amp; isi");
  });
});
