import { eq } from "drizzle-orm";
import { deliveryAttempts, NewDeliveryAttempt } from "../../../db/schema.js";
import { db } from "../../index.js";

export async function getDeliveryAttemptsByJobId(jobId: string) {
  return await db
    .select()
    .from(deliveryAttempts)
    .where(eq(deliveryAttempts.jobId, jobId));
}

export async function createDeliveryAttempt(data: NewDeliveryAttempt) {
  const [result] = await db.insert(deliveryAttempts).values(data).returning();
  return result;
}

export async function deleteAllDeliveryAttempts() {
  return await db.delete(deliveryAttempts);
}
