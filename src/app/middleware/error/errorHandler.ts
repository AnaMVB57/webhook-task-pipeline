import { Request, Response, NextFunction } from "express";
import { AppError } from "./errors.js";

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (res.headersSent) {
    return next(err);
  }

  // 2. Interceptar error nativo de Express/body-parser (JSON mal formado)
  if (
    err instanceof SyntaxError &&
    "body" in err &&
    (err as any).status === 400
  ) {
    console.error(`[Bad Request Error]: Invalid JSON syntax`);
    return res.status(400).json({
      error: "Payload contains an invalid JSON. Please verify the syntax.",
    });
  }

  // 3. Manejar nuestros errores personalizados de negocio
  if (err instanceof AppError) {
    console.error(`[AppError] ${err.statusCode}: ${err.message}`);
    return res.status(err.statusCode).json({ error: err.message });
  }

  // 4. Fallback para errores no controlados (Crashes de base de datos, nulos, etc.)
  console.error("[Unhandled Error]:", err);
  return res.status(500).json({ error: "Something went wrong on our end" });
}
