import { NextFunction, Request, Response } from "express";

/**
 * Centralized error handler.
 * - Keeps responses consistent as JSON.
 * - Converts common Mongo/Mongoose/JWT errors to useful HTTP status codes.
 *
 * notes:
 * - CastError: usually invalid ObjectId (400)
 * - DuplicateKey (code 11000): resource already exists (409)
 * - ValidationError: joi/mongoose validation issues (400)
 * - JsonWebTokenError / TokenExpiredError: auth token problems (401)
 */
export default function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  let statusCode: number = err?.statusCode || 500;
  let message: string = err?.message || "Internal Server Error";
  let errors: string[] | null = null;

  // MongoDB CastError - invalid ObjectId
  if (err?.name === "CastError") {
    statusCode = 400;
    message = `Invalid ${err?.path}: ${err?.value}`;
  }

  // MongoDB Duplicate Key
  if (err?.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err?.keyValue || {})[0];
    message = `${field} already exists`;
  }

  // Mongoose Validation Error
  if (err?.name === "ValidationError") {
    statusCode = 400;
    errors = Object.values(err?.errors || {}).map((e: any) => e?.message);
    message = "Validation Error";
  }

  // JWT Errors
  if (err?.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
  }

  if (err?.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired";
  }

  // NOTE: keep stack only during development (security best practice)
  const stack =
    process.env.NODE_ENV === "development" ? err?.stack : undefined;

  return res.status(statusCode).json({
    success: false,
    status: statusCode,
    message,
    errors,
    stack,
  });
}
