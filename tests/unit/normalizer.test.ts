import { GmailNormalizer } from "../../src/lib/providers/gmail/gmail.normalizer";

async function runNormalizerTests() {
  console.log("Starting GmailNormalizer unit tests...");
  const normalizer = new GmailNormalizer();

  const simulatedRaw = { simulated: true };
  const normalized = await normalizer.normalizeMessage(simulatedRaw);

  if (
    normalized.subject === "Simulated client query" &&
    normalized.isStarred === false
  ) {
    console.log("✅ Test 1: Simulated normalization succeeded!");
  } else {
    console.error("❌ Test 1: Simulated normalization failed!");
    console.error(normalized);
    process.exit(1);
  }

  const rawMsg = {
    id: "12345",
    threadId: "67890",
    snippet: "Hello there",
    internalDate: "1719878400000",
    labelIds: ["INBOX", "UNREAD", "IMPORTANT"],
    payload: {
      headers: [
        { name: "From", value: "alice@test.com" },
        { name: "To", value: "bob@test.com" },
        { name: "Subject", value: "Meeting reminder" },
        { name: "Message-ID", value: "<custom_id@test.com>" },
      ],
      body: {
        data: "PHA+SGVsbG8gdGhlcmU8L3A+",
      },
      mimeType: "text/html",
    },
  };

  const normalizedReal = await normalizer.normalizeMessage(rawMsg);

  if (
    normalizedReal.providerMessageId === "12345" &&
    normalizedReal.sender === "alice@test.com" &&
    normalizedReal.subject === "Meeting reminder" &&
    normalizedReal.isRead === false &&
    normalizedReal.isImportant === true &&
    normalizedReal.htmlBody?.includes("<p>Hello there</p>")
  ) {
    console.log("✅ Test 2: Real payload normalization succeeded!");
  } else {
    console.error("❌ Test 2: Real payload normalization failed!");
    console.error(normalizedReal);
    process.exit(1);
  }

  console.log("All normalizer unit tests passed successfully!");
}

runNormalizerTests().catch((err) => {
  console.error("Normalizer tests failed with exception:", err);
  process.exit(1);
});
