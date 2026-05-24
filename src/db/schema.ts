import { randomUUID } from "crypto";
import {
  pgTable,
  text,
  timestamp,
  boolean,
  jsonb,
  pgEnum,
  integer,
} from "drizzle-orm/pg-core";

export const jobStatusEnum = pgEnum("job_status", [
  "pending",
  "processing",
  "completed",
  "failed",
]);

export const deliveryStatusEnum = pgEnum("delivery_status", [
  "success",
  "failed",
]);

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  active: boolean("active").notNull().default(true),
});

export const actions = pgTable("actions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  name: text("name").notNull().unique(),
  description: text("description").notNull(),
  config: jsonb("config"),
});

export const pipelines = pgTable("pipelines", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  name: text("name").notNull(),
  sourceToken: text("source_token").notNull().unique()
    .$defaultFn(() => randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  actionId: text("action_id")
    .notNull()
    .references(() => actions.id),
  active: boolean("active").notNull().default(true),
});

export const subscribers = pgTable("subscribers", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  pipelineId: text("pipeline_id")
    .notNull()
    .references(() => pipelines.id),
  url: text("url").notNull(),
  active: boolean("active").notNull().default(true),
});

export const jobs = pgTable("jobs", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  pipelineId: text("pipeline_id")
    .notNull()
    .references(() => pipelines.id),
  status: jobStatusEnum("status").notNull().default("pending"),
  payload: jsonb("payload").notNull(),
  output: jsonb("output"),
});

export const deliveryAttempts = pgTable("delivery_attempts", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  attemptedAt: timestamp("attempted_at").notNull().defaultNow(),
  jobId: text("job_id")
    .notNull()
    .references(() => jobs.id),
  subscriberId: text("subscriber_id")
    .notNull()
    .references(() => subscribers.id),
  status: deliveryStatusEnum("status").notNull(),
  responseCode: integer("response_code"),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Action = typeof actions.$inferSelect;
export type NewAction = typeof actions.$inferInsert;

export type Pipeline = typeof pipelines.$inferSelect;
export type NewPipeline = typeof pipelines.$inferInsert;

export type Subscriber = typeof subscribers.$inferSelect;
export type NewSubscriber = typeof subscribers.$inferInsert;

export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;

export type DeliveryAttempt = typeof deliveryAttempts.$inferSelect;
export type NewDeliveryAttempt = typeof deliveryAttempts.$inferInsert;