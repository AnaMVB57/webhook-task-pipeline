import { Request, Response, NextFunction } from "express";
import { AppError } from "./errors.js";

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (res.headersSent) {
    return next(err);
  }

  // 2. Intercept native Express/body-parser error (malformed JSON)
  if (
    err instanceof SyntaxError &&
    "body" in err &&
    (err as SyntaxError & { status?: number }).status === 400
  ) {
    console.error(`[Bad Request Error]: Invalid JSON syntax`);
    return res.status(400).json({
      error: "Payload contains an invalid JSON. Please verify the syntax.",
    });
  }

  // 3. Managing our custom business errors
  if (err instanceof AppError) {
    console.error(`[AppError] ${err.statusCode}: ${err.message}`);
    return res.status(err.statusCode).json({ error: err.message });
  }

  // 4. Fallback for unhandled errors (database crashes, nulls, etc.)
  console.error("[Unhandled Error]:", err);
  return res.status(500).json({ error: "Something went wrong on our end" });
}
