import { NextFunction, Request, Response } from "express";
import { Schema } from "joi";

/**
 * Request validation middleware factory.
 * ---------------------------------------
 * Usage:
 *   router.post("/x", validate(schema), controller)
 *
 * - Reads data from req[property] (defaults to req.body)
 * - Runs joi validation with:
 *   - abortEarly: false  (collect all errors)
 *   - stripUnknown: true (remove unknown fields)
 * - On success: replaces req[property] with the sanitized value
 *
 * notes:
 * - Keep response format consistent: { message, errors: [{field, message}] }
 */
export default function validate(schema: Schema, property: string = "body") {
  return (req: Request, res: Response, next: NextFunction) => {
    const data = (req as any)[property];

    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        message: "Validation Error",
        errors: error.details.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        })),
      });
    }

    (req as any)[property] = value;
    return next();
  };
}
