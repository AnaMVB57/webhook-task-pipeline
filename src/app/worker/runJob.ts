import { getActionById } from "../../db/queries/actions/actions.js";
import {
  getJobById,
  incrementJobAttempts,
  updateJobStatus,
} from "../../db/queries/jobs/jobs.js";
import { getSubscribersByPipelineId } from "../../db/queries/subscribers/subscribers.js";
import { Job } from "../../db/schema.js";
import { deliverToAllSubscribers } from "./resultsDelivery.js";
import { processJob } from "./actionProcessor.js";
import { getPipelineById } from "../../db/queries/pipelines/pipelines.js";

export async function runJob(job: Job): Promise<void> {
  // Fetch fresh job state. A polling worker may pick up a job already being processed
  const freshJob = await getJobById(job.id);

  // Skip jobs already completed or permanently failed
  if (freshJob.status === "completed" || freshJob.status === "failed") {
    console.log(`[Worker] Skipping job ${job.id} — already ${freshJob.status}`);
    return;
  }

  // Skip jobs that exhausted retries
  if (freshJob.attempts >= freshJob.maxAttempts) {
    console.warn(
      `[Worker] Job ${job.id} reached max attempts (${freshJob.maxAttempts}), marking as failed`,
    );
    await updateJobStatus(job.id, "failed");
    return;
  }

  console.log(
    `[Worker] Processing job ${job.id} (attempt ${freshJob.attempts + 1}/${freshJob.maxAttempts})`,
  );

  await incrementJobAttempts(job.id, "processing");

  try {
    // Get pipeline by id
    const pipelineData = await getPipelineById(job.pipelineId);

    //Lineage tracking

    // We make sure payload is an object
    const currentPayload =
      typeof job.payload === "string"
        ? JSON.parse(job.payload)
        : (job.payload as Record<string, unknown>);

    // We get the last trace or initialize an empty array
    const trace: string[] = Array.isArray(currentPayload._trace)
      ? currentPayload._trace
      : [];

    if (trace.includes(pipelineData.sourceToken)) {
      console.warn(
        `* [WARNING] - Infinite loop detected on job - ${job.id} (Pipeline: ${pipelineData.name})`,
      );
      await updateJobStatus(job.id, "failed");
      return;
    }

    currentPayload._trace = [...trace, pipelineData.sourceToken];
    job.payload = currentPayload;

    console.log(`Pipeline: ${job.pipelineId}`);
    console.log(`Payload:`, JSON.stringify(job.payload, null, 2));

    const action = await getActionById(pipelineData.actionId);

    // Execute the action on the payload
    const output = await processJob(
      job,
      action.name,
      action.config as Record<string, unknown> | null,
    );

    await updateJobStatus(job.id, "completed", output);

    // Get active subscribers from pipeline
    const allSubscribers = await getSubscribersByPipelineId(job.pipelineId);
    const activeSubscribers = allSubscribers.filter((s) => s.active);

    if (activeSubscribers.length === 0) {
      console.log(
        `[Worker] Job ${job.id} completed — no active subscribers to deliver to`,
      );
      return;
    }

    await deliverToAllSubscribers(job.id, activeSubscribers, output);

    console.log(`Job ${job.id} completed successfully`);
  } catch (error) {
    // Mark job as failed is anything goes wrong
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    console.error(`Job ${job.id} failed: ${errorMessage}`);
    await updateJobStatus(job.id, "failed");
  }
}
