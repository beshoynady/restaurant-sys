import { NextFunction, Request, Response } from "express";

/**
 * Wrap async route handlers and forward errors to Express error middleware.
 * @example router.get("/", asyncHandler(async (req, res) => { ... }))
 */
export default function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>,
) {
  return function (req: Request, res: Response, next: NextFunction) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
