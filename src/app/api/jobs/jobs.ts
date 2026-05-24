import { Request, Response } from "express";
import {
  getAllJobs,
  getJobsByPipelineId,
  getJobById,
} from "../../../db/queries/jobs/jobs.js";
import { getDeliveryAttemptsByJobId } from "../../../db/queries/deliveryAttempts/deliveryAttempts.js";
import z from "zod";
import { BadRequestError } from "../../middleware/error/errors.js";

// Validation
const idParamSchema = z.object({
  id: z.string().uuid(),
});

export async function handleGetAllJobs(req: Request, res: Response) {
  const { pipelineId } = req.query;

  if (pipelineId) {
    const result = await getJobsByPipelineId(pipelineId as string);
    res.json(result);
    return;
  }

  const result = await getAllJobs();
  res.json(result);
}

export async function handleGetJobById(req: Request, res: Response) {
  const params = idParamSchema.safeParse(req.params);
  if (!params.success) {
    throw new BadRequestError("Invalid job ID");
  }
  const result = await getJobById(params.data.id);
  res.json(result);
}

export async function handleGetJobDeliveries(req: Request, res: Response) {
  const params = idParamSchema.safeParse(req.params);
  if (!params.success) {
    throw new BadRequestError("Invalid user ID");
  }
  const result = await getDeliveryAttemptsByJobId(params.data.id);
  res.json(result);
}