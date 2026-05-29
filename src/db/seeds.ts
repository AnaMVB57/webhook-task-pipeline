import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  actions,
  deliveryAttempts,
  jobs,
  pipelines,
  subscribers,
  users,
} from "./schema.js";
import * as schema from "./schema.js";

const queryClient = postgres(
  process.env.DB_URL || "postgres://postgres:postgres@db:5432/webhook_pipeline",
);
const db = drizzle(queryClient, { schema });

async function main() {
  console.log("Starting Database Seeding...");

  // 1. CLEANUP EVERY EXISTING RECORD
  console.log("Cleaning up database tables...");
  await db.delete(deliveryAttempts);
  await db.delete(jobs);
  await db.delete(subscribers);
  await db.delete(pipelines);
  await db.delete(actions);
  await db.delete(users);

  // 2. SEED USERS (Linear Flow User vs Loop Challenge User)
  console.log("Seeding Users...");
  await db.insert(users).values([
    {
      id: "9c83aeee-4f10-4538-a55a-b7053b7bf0a2",
      name: "Ana Garcia",
      email: "ana@example.com",
      active: true,
    },
    {
      id: "3a71bddd-2e10-482f-b05e-5293810badd2",
      name: "Charles Babbage",
      email: "charles@example.com",
      active: true,
    },
  ]);

  // 3. SEED ACTIONS
  console.log("Seeding Actions...");
  await db.insert(actions).values([
    {
      id: "9e9baf6f-bcf7-4428-b2c7-250027482c5f",
      name: "CALCULATE_TOTAL",
      description: "Sums numeric values from an array field in the payload",
      config: {
        arrayField: "items",
        priceField: "price",
        quantityField: "quantity",
      },
    },
    {
      id: "80316db3-b39f-4f46-a130-595d6a26c722",
      name: "TEXT_TEMPLATER",
      description: "Fills a text template with payload values",
      config: {
        template:
          "Hello {{customer}}!\n\nThank you for choosing {{store_name}}. This is a summary of your purchase made on {{date}}:\n\n{{items}}\n\nSubtotal: ${{subtotal}}\nTotal paid: ${{total_amount}}\n\nCurrent status of your order: {{status}}\n\nWe hope to see you soon!",
      },
    },
    {
      id: "f2d8b728-ce46-443d-a815-f175c2599b2d",
      name: "TRANSLATE_TEXT",
      description: "Translates formatted_text to customer language",
      config: { textField: "formatted_text", languageField: "lang" },
    },
    {
      id: "47f6ecf5-4e64-426f-b25b-504b3d3f0c68",
      name: "SEND_EMAIL",
      description: "Sends the translated text as an email via Ethereal",
      config: {
        toField: "email",
        subjectField: "subject",
        bodyField: "translated_text",
      },
    },
  ]);

  // 4. SEED PIPELINES
  console.log("Seeding Pipelines...");
  await db.insert(pipelines).values([
    // === FLOW 1: ANA GARCIA (VALID LINEAR CHAIN) ===
    {
      id: "9ccaa884-91f0-482f-a05e-5293810badd1",
      name: "Calculate total amount",
      sourceToken: "dd777e4f-5236-464d-8a20-387143798446",
      userId: "9c83aeee-4f10-4538-a55a-b7053b7bf0a2",
      actionId: "9e9baf6f-bcf7-4428-b2c7-250027482c5f",
      active: true,
    },
    {
      id: "f065e32e-0f05-48ad-bf69-98189653a32d",
      name: "Create text template",
      sourceToken: "674b821f-086e-4e47-a955-936e18662654",
      userId: "9c83aeee-4f10-4538-a55a-b7053b7bf0a2",
      actionId: "80316db3-b39f-4f46-a130-595d6a26c722",
      active: true,
    },
    {
      id: "140bd2dc-6d76-45a2-99fa-9bd0c7d55dbd",
      name: "Translate text message",
      sourceToken: "e5cc6c39-734b-4dd0-96d6-2da58996c04c",
      userId: "9c83aeee-4f10-4538-a55a-b7053b7bf0a2",
      actionId: "f2d8b728-ce46-443d-a815-f175c2599b2d",
      active: true,
    },
    {
      id: "66c69421-bc23-4540-a791-7af308c6aba1",
      name: "Send email to customer",
      sourceToken: "ea959a1c-9432-46ad-9572-c2fd8f7b6fea",
      userId: "9c83aeee-4f10-4538-a55a-b7053b7bf0a2",
      actionId: "47f6ecf5-4e64-426f-b25b-504b3d3f0c68",
      active: true,
    },

    // === FLOW 2: CHARLES BABBAGE (MALFORMED LOOP PATHWAY) ===
    {
      id: "a1111111-1111-1111-1111-111111111111",
      name: "Loop Check - Calculate total",
      sourceToken: "loop-token-calculate-000000000001",
      userId: "3a71bddd-2e10-482f-b05e-5293810badd2",
      actionId: "9e9baf6f-bcf7-4428-b2c7-250027482c5f",
      active: true,
    },
    {
      id: "b2222222-2222-2222-2222-222222222222",
      name: "Loop Check - Create template",
      sourceToken: "loop-token-template-000000000002",
      userId: "3a71bddd-2e10-482f-b05e-5293810badd2",
      actionId: "80316db3-b39f-4f46-a130-595d6a26c722",
      active: true,
    },
    {
      id: "c3333333-3333-3333-3333-333333333333",
      name: "Loop Check - Translate message",
      sourceToken: "loop-token-translate-000000000003",
      userId: "3a71bddd-2e10-482f-b05e-5293810badd2",
      actionId: "f2d8b728-ce46-443d-a815-f175c2599b2d",
      active: true,
    },
  ]);

  // 5. SEED SUBSCRIBERS
  console.log("Seeding Subscribers (Chaining Webhooks)...");
  await db.insert(subscribers).values([
    // === FLOW 1: LINEAR SUBSCRIPTION WEBHOOKS ===
    {
      pipelineId: "9ccaa884-91f0-482f-a05e-5293810badd1", // Pipeline 1 -> Points to Pipeline 2
      url: "http://app:3000/api/webhooks/674b821f-086e-4e47-a955-936e18662654",
      active: true,
    },
    {
      pipelineId: "f065e32e-0f05-48ad-bf69-98189653a32d", // Pipeline 2 -> Points to Pipeline 3
      url: "http://app:3000/api/webhooks/e5cc6c39-734b-4dd0-96d6-2da58996c04c",
      active: true,
    },
    {
      pipelineId: "140bd2dc-6d76-45a2-99fa-9bd0c7d55dbd", // Pipeline 3 -> Points to Pipeline 4
      url: "http://app:3000/api/webhooks/ea959a1c-9432-46ad-9572-c2fd8f7b6fea",
      active: true,
    },
    {
      pipelineId: "66c69421-bc23-4540-a791-7af308c6aba1", // Pipeline 4 -> Final Outbound Destination
      url: "https://webhook.site/eb208e66-651f-40e2-96eb-4003dfbbbcf1",
      active: true,
    },

    // === FLOW 2: INTENTIONAL LOOP INFRASTRUCTURE TESTING ===
    {
      pipelineId: "a1111111-1111-1111-1111-111111111111", // Loop 1 -> Points to Loop 2
      url: "http://app:3000/api/webhooks/loop-token-template-000000000002",
      active: true,
    },
    {
      pipelineId: "b2222222-2222-2222-2222-222222222222", // Loop 2 -> Points to Loop 3
      url: "http://app:3000/api/webhooks/loop-token-translate-000000000003",
      active: true,
    },
    {
      pipelineId: "c3333333-3333-3333-3333-333333333333", // Loop 3 -> Points BACK to Loop 2 (Triggers Infinite Cycle)
      url: "http://app:3000/api/webhooks/loop-token-template-000000000002",
      active: true,
    },
  ]);

  console.log("Database successfully seeded and ready for testing!");
  await queryClient.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("Seeding process critically failed:", err);
  process.exit(1);
});
