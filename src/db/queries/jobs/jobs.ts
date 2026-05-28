import { eq, lt, and } from "drizzle-orm";
import { jobs, NewJob } from "../../../db/schema.js";
import { db } from "../../index.js";
import { NotFoundError } from "../../../app/middleware/error/errors.js";

export async function getAllJobs() {
  return await db.select().from(jobs);
}

export async function getJobsByPipelineId(pipelineId: string) {
  return await db.select().from(jobs).where(eq(jobs.pipelineId, pipelineId));
}

export async function getJobById(id: string) {
  const [result] = await db.select().from(jobs).where(eq(jobs.id, id));
  if (!result) {
    throw new NotFoundError("Job not found");
  }
  return result;
}

export async function createJob(data: NewJob) {
  const [result] = await db.insert(jobs).values(data).returning();
  return result;
}

export async function updateJobStatus(
  id: string,
  status: "pending" | "processing" | "completed" | "failed",
  output?: unknown,
) {
  const [result] = await db
    .update(jobs)
    .set({ status, ...(output !== undefined && { output }) })
    .where(eq(jobs.id, id))
    .returning();
  if (!result) {
    throw new NotFoundError("Job not found");
  }
  return result;
}

export async function incrementJobAttempts(
  id: string,
  status: "processing" | "failed",
) {
  const current = await getJobById(id);

  const [result] = await db
    .update(jobs)
    .set({
      attempts: current.attempts + 1,
      status,
    })
    .where(eq(jobs.id, id))
    .returning();

  return result;
}

export async function getPendingJobs() {
  return await db
    .select()
    .from(jobs)
    .where(
      and(eq(jobs.status, "pending"), lt(jobs.attempts, jobs.maxAttempts)),
    );
}

export async function deleteAllJobs() {
  return await db.delete(jobs);
}
