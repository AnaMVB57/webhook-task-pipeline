import { eq } from "drizzle-orm";
import { subscribers, NewSubscriber } from "../../../db/schema.js";
import { db } from "../../index.js";
import { NotFoundError } from "../../../app/middleware/error/errors.js";

export async function getAllSubscribers() {
  return await db.select().from(subscribers);
}

export async function getSubscribersByPipelineId(pipelineId: string) {
  return await db
    .select()
    .from(subscribers)
    .where(eq(subscribers.pipelineId, pipelineId));
}

export async function getSubscriberById(id: string) {
  const [result] = await db
    .select()
    .from(subscribers)
    .where(eq(subscribers.id, id));
  if (!result) {
    throw new NotFoundError("Subscriber not found");
  }
  return result;
}

export async function createSubscriber(data: NewSubscriber) {
  const [result] = await db
    .insert(subscribers)
    .values(data)
    .returning();
  return result;
}

export async function updateSubscriber(id: string, data: Partial<NewSubscriber>) {
  const [result] = await db
    .update(subscribers)
    .set(data)
    .where(eq(subscribers.id, id))
    .returning();
  if (!result) {
    throw new NotFoundError("Subscriber not found");
  }
  return result;
}

export async function deleteSubscriber(id: string) {
  const [result] = await db
    .delete(subscribers)
    .where(eq(subscribers.id, id))
    .returning();
  if (!result) {
    throw new NotFoundError("Subscriber not found");
  }
  return result;
}