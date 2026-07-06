import { MailService } from "../../src/services/mail.service";

async function runTests() {
  console.log("Starting Outbound Mail Engine unit tests...");
  const mailService = new MailService();

  // Test 1: Template Variable Replacement
  const templateHtml =
    "<p>Hello {{client}}, welcome to {{company}}. Sincerely, {{sender}} on {{date}}.</p>";
  const variables = {
    client: "Alice",
    company: "Acme Corp",
    sender: "Bob",
    date: "2026-07-07",
  };

  const rendered = mailService.renderTemplate(templateHtml, variables);
  const expected =
    "<p>Hello Alice, welcome to Acme Corp. Sincerely, Bob on 2026-07-07.</p>";

  if (rendered === expected) {
    console.log("✅ Test 1: Template parsing succeeded!");
  } else {
    console.error("❌ Test 1: Template parsing failed!");
    console.error(`Expected: ${expected}`);
    console.error(`Received: ${rendered}`);
    process.exit(1);
  }

  // Test 2: Message-ID Generation checks
  const msgId = (mailService as any).generateMessageId();
  const formatMatch = /^<[0-9a-fA-F-]{36}@annex-consultancy\.com>$/.test(msgId);
  if (formatMatch) {
    console.log("✅ Test 2: Message-ID generation format succeeded!");
  } else {
    console.error("❌ Test 2: Message-ID generation format failed!");
    console.error(`Generated ID: ${msgId}`);
    process.exit(1);
  }

  console.log("All unit tests passed successfully!");
}

runTests().catch((err) => {
  console.error("Tests failed with exception:", err);
  process.exit(1);
});
