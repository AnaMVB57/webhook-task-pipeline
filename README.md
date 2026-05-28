# Webhook-Driven Task Processing Pipeline
 
A robust, event-driven background job processing system built with Node.js and TypeScript. This service allows users to create customizable pipelines that receive incoming webhook payloads, execute data transformation actions, and deliver results to one or more registered subscribers — including other pipelines, enabling fully chainable processing workflows.
 
---
 
## Tech Stack
 
- **Runtime**: Node.js 20 + TypeScript
- **Framework**: Express 5
- **Database**: PostgreSQL 16 (via Docker)
- **ORM**: Drizzle ORM
- **Validation**: Zod
- **Email**: Nodemailer + Ethereal Email
- **Package Manager**: pnpm
- **Containerization**: Docker + Docker Compose
- **CI**: GitHub Actions
---
 
## 🚀 Setup & Installation
 
### Prerequisites
 
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Node.js 20+](https://nodejs.org/)
- [pnpm](https://pnpm.io/installation)
### 1. Clone the repository
 
```bash
git clone https://github.com/your-username/webhook-task-pipeline.git
cd webhook-task-pipeline
```
 
### 2. Install dependencies
 
```bash
pnpm install
```
 
### 3. Environment variables
 
```bash
cp .env.example .env
```
 
Your `.env` file should contain:
 
```env
DB_URL=postgres://postgres:postgres@localhost:5432/webhook_pipeline
PORT=3000
```
 
> When running with Docker Compose, the app service uses `@db:` instead of `@localhost:` internally. The `.env` file is used for local development only.
 
### 4. Start the database
 
```bash
docker compose up -d db
```
 
### 5. Run database migrations
 
Generate the migration files and apply them to the database:
 
```bash
pnpm db:generate
```
 
Then apply the generated SQL file directly:
 
```bash
docker exec -i webhook-task-pipeline-db-1 psql -U postgres -d webhook_pipeline < src/db/migrations/<migration_file>.sql
```
 
### 6. Start the development server
 
```bash
pnpm dev
```
 
The API server and background worker start together on port `3000`.
 
---
 
## 🐳 Running with Docker Compose
 
To run the full stack (database + application) with a single command:
 
```bash
docker compose up --build
```
 
This starts:
- `db` — PostgreSQL 16 database
- `app` — the Node.js API server and background worker
> **Note:** you still need to apply database migrations manually after the first run (see step 5 above, replacing `localhost` with the container name if connecting from outside Docker).
 
Access the API at `http://localhost:3000`.
 
---
 
## 📚 API Reference
 
All endpoints return JSON. Error responses follow the format `{ "error": "message" }`.
 
### Health check
 
```
GET /health
```
 
Returns `{ "status": "ok" }` when the server is running.
 
---
 
### Users `/api/users`
 
Manage pipeline owners.
 
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/users` | List all users |
| GET | `/api/users/:id` | Get user by ID |
| POST | `/api/users` | Create a user |
| PUT | `/api/users/:id` | Update a user |
| DELETE | `/api/users/:id` | Delete a user |
 
**Create user — request body:**
```json
{
  "name": "Ana García",
  "email": "ana@example.com"
}
```
 
---
 
### Actions `/api/actions`
 
Define reusable processing logic. Each action has a `name`, `description`, and a `config` object that controls its behavior.
 
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/actions` | List all actions |
| GET | `/api/actions/:id` | Get action by ID |
| POST | `/api/actions` | Create an action |
| PUT | `/api/actions/:id` | Update an action |
| DELETE | `/api/actions/:id` | Delete an action |
 
**Available action types and their configs:**
 
`CALCULATE_TOTAL` — sums numeric values from an array field:
```json
{
  "name": "CALCULATE_TOTAL",
  "description": "Sums item prices from the payload",
  "config": { "arrayField": "items", "priceField": "price", "quantityField": "quantity" }
}
```
 
`TRANSLATE_TEXT` — translates a text field using the MyMemory API:
```json
{
  "name": "TRANSLATE_TEXT",
  "description": "Translates the message to the customer's language",
  "config": { "textField": "message", "languageField": "lang" }
}
```
 
`TEXT_TEMPLATER` — fills a template string with `{{field}}` variables:
```json
{
  "name": "TEXT_TEMPLATER",
  "description": "Formats the payload into a readable text template",
  "config": {
    "template": "Customer: {{customer}}\nTotal: ${{total_amount}}\n\n{{translated_text}}"
  }
}
```
 
`SEND_EMAIL` — sends the `formatted_text` field as an email via Ethereal:
```json
{
  "name": "SEND_EMAIL",
  "description": "Sends the formatted text as an email to the customer",
  "config": { "toField": "email", "subjectField": "subject", "bodyField": "body" }
}
```
 
---
 
### Pipelines `/api/pipelines`
 
A pipeline connects a unique webhook URL (`sourceToken`) to a single action and one or more subscribers.
 
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/pipelines` | List all pipelines |
| GET | `/api/pipelines/:id` | Get pipeline by ID |
| POST | `/api/pipelines` | Create a pipeline |
| PUT | `/api/pipelines/:id` | Update a pipeline |
| DELETE | `/api/pipelines/:id` | Delete a pipeline |
 
**Create pipeline — request body:**
```json
{
  "name": "Calculate Total",
  "userId": "<user-id>",
  "actionId": "<action-id>"
}
```
 
The response includes a `sourceToken` — this is the unique identifier used in the webhook URL for this pipeline.
 
---
 
### Subscribers `/api/subscribers`
 
Register destination URLs where processed results are delivered. A subscriber URL can point to an external endpoint or to another pipeline's webhook URL, enabling pipeline chaining.
 
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/subscribers` | List all subscribers |
| GET | `/api/subscribers/pipeline/:pipelineId` | List subscribers for a pipeline |
| GET | `/api/subscribers/:id` | Get subscriber by ID |
| POST | `/api/subscribers` | Create a subscriber |
| PUT | `/api/subscribers/:id` | Update a subscriber |
| DELETE | `/api/subscribers/:id` | Delete a subscriber |
 
**Create subscriber — request body:**
```json
{
  "pipelineId": "<pipeline-id>",
  "url": "https://webhook.site/your-unique-url"
}
```
 
To chain pipelines, set `url` to another pipeline's webhook endpoint:
```json
{
  "pipelineId": "<pipeline-1-id>",
  "url": "http://localhost:3000/api/webhooks/<sourceToken-of-pipeline-2>"
}
```
 
---
 
### Webhook Ingestion `/api/webhooks/:sourceToken`
 
The main entry point for incoming events.
 
```
POST /api/webhooks/:sourceToken
```
 
- Accepts any valid JSON body
- Responds immediately with `200 OK` and the created job ID
- Queues the payload for background processing
**Example request:**
```json
{
  "customer": "Anton",
  "email": "anton.yak12@yamail.com",
  "lang": "en",
  "store_name": "Ruta Austral",
  "date": "2026-05-27",
  "status": "En proceso de envío",
  "subject": "Confirmación de compra",
  "items": [
    { "name": "Café Tueste Medio 250g", "quantity": 12, "price": 8500 },
    { "name": "Filtros de papel V60", "quantity": 2, "price": 4500 }
  ]
}
```
 
**Response:**
```json
{
  "jobId": "af50bb4c-2df2-4da3-9e61-89a22522680b",
  "status": "queued"
}
```
 
---
 
### Jobs `/api/jobs`
 
Query job processing status and delivery history.
 
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/jobs` | List all jobs (filter by `?pipelineId=`) |
| GET | `/api/jobs/:id` | Get job by ID |
| GET | `/api/jobs/:id/deliveries` | Get delivery attempts for a job |
 
**Job status values:** `pending` → `processing` → `completed` / `failed`
 
---
 
## 🔗 Pipeline Chaining Example
 
The system supports chaining multiple pipelines by pointing each pipeline's subscriber URL at the next pipeline's webhook endpoint. This creates a sequential data transformation flow where each step enriches the payload before passing it forward.
 
```
POST /api/webhooks/<token-pipeline-1>   ← entry point
         │
         ▼ CALCULATE_TOTAL
         │  adds: total_amount
         │
         ▼ TRANSLATE_TEXT
         │  adds: translated_text
         │
         ▼ TEXT_TEMPLATER
         │  adds: formatted_text
         │
         ▼ SEND_EMAIL
            sends email → email_sent: true, email_preview_url: "..."
```
 
The email preview URL is printed in the server logs and can be opened in a browser to view the rendered email (powered by Ethereal Email — no real credentials needed).
 
---
 
## 🏗️ Architecture
 
This project implements a choreography-based event-driven architecture: each component reacts to events independently without a central orchestrator directing the flow.
 
### Ingestion
 
When a webhook hits `POST /api/webhooks/:sourceToken`, the handler:
 
1. Looks up the pipeline by `sourceToken`
2. Creates a `Job` record in the database with `status: "pending"`
3. Responds `200 OK` immediately — the HTTP connection is freed in milliseconds
4. Fires background processing without awaiting the result
### Background processing
 
Two mechanisms handle job execution:
 
**Immediate path:** `runJob()` is called directly in the background after the webhook response. This processes the job with zero delay under normal conditions.
 
**Recovery path (polling worker):** a `setInterval` loop runs every 10 seconds, querying for jobs still in `pending` state. This recovers jobs that were created but never processed — for example, if the server restarted mid-flight.
 
### Execution
 
The worker fetches the pipeline's associated action and its `config`, then calls `processJob()` which routes execution to the appropriate transformation function based on `action.name`.
 
### Delivery
 
After the action completes, the worker fetches all active subscribers for the pipeline and delivers the output payload to each URL via HTTP POST. Delivery to all subscribers happens in parallel using `Promise.all`.
 
---
 
## 💡 Design Decisions
 
### Postgres-only queue
 
The job queue is implemented directly in PostgreSQL using a `jobs` table with a `status` enum. The polling worker queries `WHERE status = 'pending'` every 10 seconds as a recovery mechanism.
 
This choice was made because it keeps the architecture simple, eliminates external infrastructure dependencies, and is straightforward to reason about and explain.
 
### Dual-path processing (immediate + polling)
 
Rather than relying solely on polling (which introduces up to 10 seconds of latency), the webhook handler fires `runJob()` immediately in the background after responding. The polling worker acts only as a fallback for jobs that were interrupted.
  
### Lineage tracking (infinite loop prevention)
 
Pipeline chaining introduces the risk of circular configurations — Pipeline A → Pipeline B → Pipeline A — which would generate infinite jobs and crash the server.
 
To prevent this, a hidden `_trace` array is injected into the payload at each step, recording the `sourceToken` of every pipeline that has processed it. Before executing, the worker checks whether the current pipeline's `sourceToken` is already in the trace. If detected, the job is marked `failed` and a warning is logged.
 
```json
{
  "_trace": ["token-pipeline-1", "token-pipeline-2", "token-pipeline-3"]
}
```
 
### Graceful degradation on external services
 
The `TRANSLATE_TEXT` action calls the MyMemory Translation API. If that service is unavailable, rate-limited, or returns an error, the action catches the exception and falls back to the original untranslated text — ensuring the rest of the pipeline continues uninterrupted.
 
### Exponential backoff on delivery
 
The delivery module retries failed HTTP deliveries up to 3 times with exponential delays (2s, then 4s). Each attempt — successful or not — is recorded as a `delivery_attempt` row, giving a complete audit trail queryable via `GET /api/jobs/:id/deliveries`.
 
### Foreign key constraints with cascade
 
Deleting a pipeline automatically deletes its associated subscribers via `ON DELETE CASCADE`. This was added after encountering foreign key violations when trying to clean up test data, and reflects the correct ownership semantics: subscribers have no meaning without their parent pipeline.
 
### Schema design — one action per pipeline
 
Each pipeline is bound to exactly one action. Rather than supporting multi-step pipelines in a single record (which would require a complex `pipeline_steps` table), chaining is achieved by connecting pipelines together through subscriber URLs. This keeps the schema simple and each pipeline unit independently testable and reusable.
 
---
 
## 🗄️ Database Schema
 
```
users
  └── pipelines (user_id → users.id)
        ├── actions (action_id → actions.id)
        ├── subscribers (pipeline_id → pipelines.id)
        └── jobs (pipeline_id → pipelines.id)
              └── delivery_attempts (job_id → jobs.id, subscriber_id → subscribers.id)
```
 
---
 
## 🛠️ Development Scripts
 
```bash
pnpm dev              # Start server with hot reload
pnpm build            # Compile TypeScript to dist/
pnpm start            # Run compiled output
pnpm lint             # Run ESLint
pnpm format:write     # Format source files with Prettier
pnpm format:check     # Check formatting without writing
pnpm db:generate      # Generate Drizzle migration files
pnpm db:migrate       # Apply migrations via drizzle-kit
pnpm db:studio        # Open Drizzle Studio at https://local.drizzle.studio
```
