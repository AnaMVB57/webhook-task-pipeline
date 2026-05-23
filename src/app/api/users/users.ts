import { Request, Response } from "express";
import { z } from "zod";
import { randomUUID } from "crypto";
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} from "../../../db/queries/users/users.js";
import { BadRequestError } from "../../middleware/error/errors.js";

// Validation
const idParamSchema = z.object({
  id: z.string().uuid(),
});

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  active: z.boolean().optional(),
});

export async function handleGetAllUsers(_req: Request, res: Response) {
  const data = await getAllUsers();
  res.json(data);
}

export async function handleGetUserById(req: Request, res: Response) {
  const params = idParamSchema.safeParse(req.params);
  if (!params.success) {
    throw new BadRequestError("Invalid user ID");
  }

  const data = await getUserById(params.data.id);
  res.json(data);
}

export async function handleCreateUser(req: Request, res: Response) {
  const result = createUserSchema.safeParse(req.body);
  if (!result.success) {
    throw new BadRequestError(JSON.stringify(result.error.flatten()));
  }

  const user = await createUser({
    id: randomUUID(),
    name: result.data.name,
    email: result.data.email,
  });

  res.status(201).json(user);
}

export async function handleUpdateUser(req: Request, res: Response) {
  const params = idParamSchema.safeParse(req.params);
  if (!params.success) {
    throw new BadRequestError("Invalid user ID");
  }

  const result = updateUserSchema.safeParse(req.body);
  if (!result.success) {
    throw new BadRequestError(JSON.stringify(result.error.flatten()));
  }

  const user = await updateUser(params.data.id, result.data);
  res.json(user);
}

export async function handleDeleteUser(req: Request, res: Response) {
  const params = idParamSchema.safeParse(req.params);
  if (!params.success) {
    throw new BadRequestError("Invalid user ID");
  }

  await deleteUser(params.data.id);
  res.json({ message: "User deleted successfully" });
}