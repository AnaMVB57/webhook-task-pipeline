import express from "express";
import { config } from "./config.js";
import { handleCreateUser, handleDeleteUser, handleGetAllUsers, handleGetUserById, handleUpdateUser } from "./app/api/users/users.js";
import { handleCreateAction, handleDeleteAction, handleGetActionById, handleGetAllActions, handleUpdateAction } from "./app/api/actions/actions.js";
import { handleCreatePipeline, handleDeletePipeline, handleGetAllPipelines, handleGetPipelineById, handleUpdatePipeline } from "./app/api/pipelines/pipelines.js";
import { errorHandler } from "./app/middleware/error/errorHandler.js";
import { handleCreateSubscriber, handleDeleteSubscriber, handleGetAllSubscribers, handleGetSubscriberById, handleGetSubscribersByPipeline, handleUpdateSubscriber } from "./app/api/subscribers/subscribers.js";
import { handleGetAllJobs, handleGetJobById, handleGetJobDeliveries } from "./app/api/jobs/jobs.js";

const app = express();
app.use(express.json());

//Heath check
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Users
app.get("/api/users", handleGetAllUsers);
app.get("/api/users/:id", handleGetUserById);
app.post("/api/users", handleCreateUser);
app.put("/api/users/:id", handleUpdateUser);
app.delete("/api/users/:id", handleDeleteUser);

// Actions
app.get("/api/actions", handleGetAllActions);
app.get("/api/actions/:id", handleGetActionById);
app.post("/api/actions", handleCreateAction);
app.put("/api/actions/:id", handleUpdateAction);
app.delete("/api/actions/:id", handleDeleteAction);

// Pipelines
app.get("/api/pipelines", handleGetAllPipelines);
app.get("/api/pipelines/:id", handleGetPipelineById);
app.post("/api/pipelines", handleCreatePipeline);
app.put("/api/pipelines/:id", handleUpdatePipeline);
app.delete("/api/pipelines/:id", handleDeletePipeline);

// Subscribers
app.get("/api/subscribers", handleGetAllSubscribers);
app.get("/api/subscribers/pipeline/:pipelineId", handleGetSubscribersByPipeline);
app.get("/api/subscribers/:id", handleGetSubscriberById);
app.post("/api/subscribers", handleCreateSubscriber);
app.put("/api/subscribers/:id", handleUpdateSubscriber);
app.delete("/api/subscribers/:id", handleDeleteSubscriber);

// Jobs (solo lectura — los crea el worker)
app.get("/api/jobs", handleGetAllJobs);
app.get("/api/jobs/:id", handleGetJobById);
app.get("/api/jobs/:id/deliveries", handleGetJobDeliveries);

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});