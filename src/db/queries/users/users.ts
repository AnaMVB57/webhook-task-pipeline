import { eq } from "drizzle-orm";
import { users, NewUser } from "../../../db/schema.js";
import { db } from "../../index.js";
import { NotFoundError } from "../../../app/middleware/error/errors.js";

export async function getAllUsers() {
  return await db.select().from(users);
}

export async function getUserById(id: string) {
  const [result] = await db.select().from(users).where(eq(users.id, id));

  if (!result) {
    throw new NotFoundError("User not found");
  }

  return result;
}

export async function createUser(data: NewUser) {
  const [result] = await db
    .insert(users)
    .values(data)
    .onConflictDoNothing()
    .returning();

  if (!result) {
    throw new Error("User already exists");
  }

  return result;
}

export async function updateUser(id: string, data: Partial<NewUser>) {
  const [result] = await db
    .update(users)
    .set(data)
    .where(eq(users.id, id))
    .returning();

  if (!result) {
    throw new NotFoundError("User not found");
  }

  return result;
}

export async function deleteUser(id: string) {
  const [result] = await db.delete(users).where(eq(users.id, id)).returning();

  if (!result) {
    throw new NotFoundError("User not found");
  }

  return result;
}
