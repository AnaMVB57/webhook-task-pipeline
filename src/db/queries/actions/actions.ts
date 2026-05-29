import { eq } from "drizzle-orm";
import { actions, NewAction } from "../../../db/schema.js";
import { db } from "../../../db/index.js";
import { NotFoundError } from "../../../app/middleware/error/errors.js";

export async function getAllActions() {
  return await db.select().from(actions);
}

export async function getActionById(id: string) {
  const [result] = await db.select().from(actions).where(eq(actions.id, id));

  if (!result) {
    throw new NotFoundError("Action not found");
  }

  return result;
}

export async function createAction(data: NewAction) {
  const [result] = await db
    .insert(actions)
    .values(data)
    .onConflictDoNothing()
    .returning();

  if (!result) {
    throw new Error("Action already exists");
  }

  return result;
}

export async function updateAction(id: string, data: Partial<NewAction>) {
  const [result] = await db
    .update(actions)
    .set(data)
    .where(eq(actions.id, id))
    .returning();

  if (!result) {
    throw new NotFoundError("Action not found");
  }

  return result;
}

export async function deleteAction(id: string) {
  const [result] = await db
    .delete(actions)
    .where(eq(actions.id, id))
    .returning();

  if (!result) {
    throw new NotFoundError("Action not found");
  }

  return result;
}
