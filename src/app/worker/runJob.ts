import { getActionById } from "../../db/queries/actions/actions.js";
import {
  incrementJobAttempts,
  updateJobStatus,
} from "../../db/queries/jobs/jobs.js";
import { getSubscribersByPipelineId } from "../../db/queries/subscribers/subscribers.js";
import { Job } from "../../db/schema.js";
import { deliverToAllSubscribers } from "./resultsDelivery.js";
import { processJob } from "./actionProcessor.js";

export async function runJob(job: Job): Promise<void> {
  console.log(`Processing job ${job.id}...`);

  await incrementJobAttempts(job.id, "processing");

  try {
    // 1. Get pipeline's action
    const pipeline = await import("../../db/queries/pipelines/pipelines.js");
    const pipelineData = await pipeline.getPipelineById(job.pipelineId);

    //Lineage tracking

    // We make sure payload is an object
    const currentPayload =
      typeof job.payload === "string"
        ? JSON.parse(job.payload)
        : (job.payload as Record<string, any>);

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

    // 2. Execute the action on the payload
    const output = await processJob(
      job,
      action.name,
      action.config as Record<string, unknown> | null,
    );

    await updateJobStatus(job.id, "completed", output);

    // 3. Get active subscribers from pipeline
    const allSubscribers = await getSubscribersByPipelineId(job.pipelineId);
    const activeSubscribers = allSubscribers.filter((s) => s.active);

    await deliverToAllSubscribers(job.id, activeSubscribers, output);

    console.log(`Job ${job.id} completed successfully`);
  } catch (error) {
    // Mark job as failed is anything goes wrong
    console.error(`Job ${job.id} failed:`, error);
    await updateJobStatus(job.id, "failed");
  }
}
