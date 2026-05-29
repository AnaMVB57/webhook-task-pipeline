import { Request, Response } from "express";
import { z } from "zod";
import { randomUUID } from "crypto";
import {
  getAllSubscribers,
  getSubscribersByPipelineId,
  getSubscriberById,
  createSubscriber,
  updateSubscriber,
  deleteSubscriber,
} from "../../../db/queries/subscribers/subscribers.js";
import { BadRequestError } from "../../middleware/error/errors.js";

// Validation
const idParamSchema = z.object({
  id: z.string().uuid(),
});

const createSubscriberSchema = z.object({
  pipelineId: z.string().uuid(),
  url: z.string().url(),
});

const updateSubscriberSchema = z.object({
  url: z.string().url().optional(),
  active: z.boolean().optional(),
});

export async function handleGetAllSubscribers(_req: Request, res: Response) {
  const result = await getAllSubscribers();
  res.json(result);
}

export async function handleGetSubscribersByPipeline(
  req: Request,
  res: Response,
) {
  const params = idParamSchema.safeParse(req.params);
  if (!params.success) {
    throw new BadRequestError("Invalid pipeline ID");
  }
  const result = await getSubscribersByPipelineId(params.data.id);
  res.json(result);
}

export async function handleGetSubscriberById(req: Request, res: Response) {
  const params = idParamSchema.safeParse(req.params);
  if (!params.success) {
    throw new BadRequestError("Invalid subscriber ID");
  }
  const result = await getSubscriberById(params.data.id);
  res.json(result);
}

export async function handleCreateSubscriber(req: Request, res: Response) {
  const parsed = createSubscriberSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new BadRequestError(JSON.stringify(parsed.error.flatten()));
  }

  const result = await createSubscriber({
    id: randomUUID(),
    pipelineId: parsed.data.pipelineId,
    url: parsed.data.url,
  });

  res.status(201).json(result);
}

export async function handleUpdateSubscriber(req: Request, res: Response) {
  const params = idParamSchema.safeParse(req.params);
  if (!params.success) {
    throw new BadRequestError("Invalid subscriber ID");
  }

  const parsed = updateSubscriberSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new BadRequestError(JSON.stringify(parsed.error.flatten()));
  }

  const result = await updateSubscriber(params.data.id, parsed.data);
  res.json(result);
}

export async function handleDeleteSubscriber(req: Request, res: Response) {
  const params = idParamSchema.safeParse(req.params);
  if (!params.success) {
    throw new BadRequestError("Invalid subscriber ID");
  }

  await deleteSubscriber(params.data.id);
  res.json({ message: "Subscriber deleted successfully" });
}
