import { Request, Response, NextFunction } from "express";
import { AppError } from "./errors.js";

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (err instanceof AppError) {

    res.status(err.statusCode).send(JSON.stringify({ error: err.message }));
  } else {

    console.log(err);
    res
      .status(500)
      .send(JSON.stringify({ error: "Something went wrong on our end" }));
  }
}