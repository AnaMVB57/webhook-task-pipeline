import { randomUUID } from "crypto";
import {
  pgTable,
  text,
  timestamp,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";

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


export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Action = typeof actions.$inferSelect;
export type NewAction = typeof actions.$inferInsert;

export type Pipeline = typeof pipelines.$inferSelect;
export type NewPipeline = typeof pipelines.$inferInsert;