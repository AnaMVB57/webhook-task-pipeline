import { Request, Response } from "express";
import { z } from "zod";
import { randomUUID } from "crypto";
import { BadRequestError } from "../../middleware/error/errors.js";
import {
  getAllPipelines,
  getPipelineById,
  createPipeline,
  updatePipeline,
  deletePipeline,
} from "../../../db/queries/pipelines/pipelines.js";

// Validation
const idParamSchema = z.object({
  id: z.string().uuid(),
});

const createPipelineSchema = z.object({
  name: z.string().min(1),
  userId: z.string().uuid(),
  actionId: z.string().uuid(),
});

const updatePipelineSchema = z.object({
  name: z.string().min(1).optional(),
  actionId: z.string().uuid().optional(),
  active: z.boolean().optional(),
});

export async function handleGetAllPipelines(_req: Request, res: Response) {
  const data = await getAllPipelines();
  res.json(data);
}

export async function handleGetPipelineById(req: Request, res: Response) {
  const params = idParamSchema.safeParse(req.params);
  if (!params.success) {
    throw new BadRequestError("Invalid user ID");
  }
  const data = await getPipelineById(params.data.id);
  res.json(data);
}

export async function handleCreatePipeline(req: Request, res: Response) {
  const result = createPipelineSchema.safeParse(req.body);
  if (!result.success) {
    throw new BadRequestError(JSON.stringify(result.error.flatten()));
  }

  const pipeline = await createPipeline({
    id: randomUUID(),
    name: result.data.name,
    userId: result.data.userId,
    actionId: result.data.actionId,
    sourceToken: randomUUID(),
  });

  res.status(201).json(pipeline);
}

export async function handleUpdatePipeline(req: Request, res: Response) {
  const params = idParamSchema.safeParse(req.params);
  if (!params.success) {
    throw new BadRequestError("Invalid user ID");
  }

  const result = updatePipelineSchema.safeParse(req.body);
  if (!result.success) {
    throw new BadRequestError(JSON.stringify(result.error.flatten()));
  }

  const pipeline = await updatePipeline(params.data.id, result.data);
  res.json(pipeline);
}

export async function handleDeletePipeline(req: Request, res: Response) {
  const params = idParamSchema.safeParse(req.params);
  if (!params.success) {
    throw new BadRequestError("Invalid user ID");
  }
  await deletePipeline(params.data.id);
  res.json({ message: "Pipeline deleted successfully" });
}
