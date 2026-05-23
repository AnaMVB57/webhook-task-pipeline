import { eq } from "drizzle-orm";
import { pipelines, NewPipeline } from "../../../db/schema.js";
import { db } from "../../index.js";
import { NotFoundError } from "../../../app/middleware/error/errors.js";

export async function getAllPipelines() {
  return await db.select().from(pipelines);
}

export async function getPipelineById(id: string) {
  const [result] = await db
    .select()
    .from(pipelines)
    .where(eq(pipelines.id, id));

  if (!result) {
    throw new NotFoundError("Pipeline not found");
  }

  return result;
}

export async function getPipelineBySourceToken(sourceToken: string) {
  const [result] = await db
    .select()
    .from(pipelines)
    .where(eq(pipelines.sourceToken, sourceToken));

  if (!result) {
    throw new NotFoundError("Pipeline not found");
  }

  return result;
}

export async function createPipeline(data: NewPipeline) {
  const [result] = await db
    .insert(pipelines)
    .values(data)
    .returning();

  return result;
}

export async function updatePipeline(id: string, data: Partial<NewPipeline>) {
  const [result] = await db
    .update(pipelines)
    .set(data)
    .where(eq(pipelines.id, id))
    .returning();

  if (!result) {
    throw new NotFoundError("Pipeline not found");
  }

  return result;
}

export async function deletePipeline(id: string) {
  const [result] = await db
    .delete(pipelines)
    .where(eq(pipelines.id, id))
    .returning();

  if (!result) {
    throw new NotFoundError("Pipeline not found");
  }

  return result;
}