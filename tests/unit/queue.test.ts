import { MemoryQueue } from "../../src/lib/queue/memory-queue";

async function runQueueTests() {
  console.log("Starting MemoryQueue unit tests...");
  const queue = new MemoryQueue();

  let jobProcessed = false;
  let jobData: unknown = null;

  queue.registerProcessor("test-job", async (job) => {
    jobProcessed = true;
    jobData = job.data;
  });

  const job = await queue.enqueue("test-job", { test: "value" });

  if (job.status === "queued" && job.name === "test-job") {
    console.log("✅ Test 1: Enqueue succeeded!");
  } else {
    console.error("❌ Test 1: Enqueue failed!");
    process.exit(1);
  }

  await new Promise((resolve) => setTimeout(resolve, 100));

  const castData = jobData as { test: string } | null;

  if (
    jobProcessed &&
    castData?.test === "value" &&
    (job.status as string) === "completed"
  ) {
    console.log("✅ Test 2: Process job async succeeded!");
  } else {
    console.error("❌ Test 2: Process job async failed!");
    console.error(
      `Processed: ${jobProcessed}, Data:`,
      jobData,
      `Status: ${job.status}`,
    );
    process.exit(1);
  }

  console.log("All queue unit tests passed successfully!");
}

runQueueTests().catch((err) => {
  console.error("Queue tests failed with exception:", err);
  process.exit(1);
});
