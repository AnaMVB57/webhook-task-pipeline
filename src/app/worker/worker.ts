import { getPendingJobs } from "../../db/queries/jobs/jobs.js";
import { runJob } from "./runJob.js";

const POLL_INTERVAL_MS = 10000; // polls every 10 seconds

async function pollPendingJobs(): Promise<void> {
  try {
    const pendingJobs = await getPendingJobs();

    if (pendingJobs.length > 0) {
      console.log(
        `Worker found ${pendingJobs.length} pending job(s), processing...`,
      );
      await Promise.all(pendingJobs.map((job) => runJob(job)));
    }
  } catch (error) {
    console.error("Worker polling error:", error);
  }
}

export function startWorker(): void {
  console.log("Background worker started");
  setInterval(pollPendingJobs, POLL_INTERVAL_MS);

  // runs inmediately at start
  pollPendingJobs();
}
