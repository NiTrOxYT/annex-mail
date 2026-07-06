import { describe, it, expect } from "vitest";
import { sanitizeHtml } from "../../src/lib/security/sanitizer";
import { validateAttachment } from "../../src/lib/security/attachment-validator";

describe("HTML Sanitizer", () => {
  it("should strip malicious script tags while retaining formatting tags", () => {
    const dirty = '<p>Hello <script>alert("XSS")</script><b>World</b></p>';
    const clean = sanitizeHtml(dirty);
    expect(clean).toBe("<p>Hello <b>World</b></p>");
  });

  it("should strip javascript: protocol URIs", () => {
    const dirty = '<a href="javascript:alert(1)">Click me</a>';
    const clean = sanitizeHtml(dirty);
    expect(clean).toBe("<a>Click me</a>");
  });
});

describe("Attachment Validator", () => {
  it("should reject files exceeding max size limit", () => {
    // max size is 10MB (10 * 1024 * 1024)
    const result = validateAttachment("document.pdf", "application/pdf", 11 * 1024 * 1024);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("size exceeds the maximum limit");
  });

  it("should reject risky extensions", () => {
    const result = validateAttachment("script.sh", "application/x-sh", 500);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Risky file type");
  });

  it("should accept valid attachments", () => {
    const result = validateAttachment("invoice.pdf", "application/pdf", 1024 * 100);
    expect(result.valid).toBe(true);
  });
});
