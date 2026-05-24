import { Request, Response } from "express";
import { z } from "zod";
import { randomUUID } from "crypto";
import { BadRequestError } from "../../middleware/error/errors.js";
import {
  getAllActions,
  getActionById,
  createAction,
  updateAction,
  deleteAction,
} from "../../../db/queries/actions/actions.js";

// Validation
const idParamSchema = z.object({
  id: z.string().uuid(),
});

const createActionSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  config: z.record(z.string(), z.unknown()).optional(),
});

const updateActionSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

export async function handleGetAllActions(_req: Request, res: Response) {
  const data = await getAllActions();
  res.json(data);
}

export async function handleGetActionById(req: Request, res: Response) {
  const params = idParamSchema.safeParse(req.params);

  if (!params.success) {
    throw new BadRequestError("Invalid user ID");
  }
  const data = await getActionById(params.data.id);
  res.json(data);
}

export async function handleCreateAction(req: Request, res: Response) {
  const result = createActionSchema.safeParse(req.body);
  if (!result.success) {
    throw new BadRequestError(JSON.stringify(result.error.flatten()));
  }

  const action = await createAction({
    id: randomUUID(),
    name: result.data.name,
    description: result.data.description,
    config: result.data.config ?? null,
  });

  res.status(201).json(action);
}

export async function handleUpdateAction(req: Request, res: Response) {
  const params = idParamSchema.safeParse(req.params);

  if (!params.success) {
    throw new BadRequestError("Invalid user ID");
  }

  const result = updateActionSchema.safeParse(req.body);
  if (!result.success) {
    throw new BadRequestError(JSON.stringify(result.error.flatten()));
  }

  const action = await updateAction(params.data.id, result.data);
  res.json(action);
}

export async function handleDeleteAction(req: Request, res: Response) {
  const params = idParamSchema.safeParse(req.params);

  if (!params.success) {
    throw new BadRequestError("Invalid user ID");
  }
  await deleteAction(params.data.id);
  res.json({ message: "Action deleted successfully" });
}
