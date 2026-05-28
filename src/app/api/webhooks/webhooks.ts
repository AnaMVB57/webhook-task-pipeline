import { Request, Response } from "express";
import { randomUUID } from "crypto";
import { getPipelineBySourceToken } from "../../../db/queries/pipelines/pipelines.js";
import { createJob } from "../../../db/queries/jobs/jobs.js";
import {
  BadRequestError,
  NotFoundError,
} from "../../middleware/error/errors.js";
import { runJob } from "../../worker/runJob.js";

export async function handleWebhook(req: Request, res: Response) {
  const { sourceToken } = req.params;

  // Validate that the body is a non-empty JSON object
  if (
    !req.body ||
    typeof req.body !== "object" ||
    Array.isArray(req.body) ||
    Object.keys(req.body).length === 0
  ) {
    throw new BadRequestError("Request body must be a non-empty JSON object.");
  }

  const pipeline = await getPipelineBySourceToken(sourceToken.toString());

  if (!pipeline.active) {
    throw new NotFoundError("Pipeline not found or inactive");
  }

  // Create job with payload
  const job = await createJob({
    id: randomUUID(),
    pipelineId: pipeline.id,
    payload: req.body,
  });

  // Respond 200 inmediately before processing
  res.status(200).json({ jobId: job.id, status: "queued" });

  // Process in background without blocking response
  runJob(job).catch((error) => {
    console.error(`Background processing failed for job ${job.id}:`, error);
  });
}
