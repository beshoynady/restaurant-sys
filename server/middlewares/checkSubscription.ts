import { NextFunction, Request, Response } from "express";

/**
 * Subscription checker middleware (TypeScript).
 *
 * notes:
 * - The current JS implementation in this repository was commented out.
 * - To keep compatibility while migrating to TypeScript, this middleware is
 *   implemented as a safe NO-OP that simply calls next().
 *
 * If later you want to enforce subscription end dates, you can port the logic
 * from checkSubscription.js here and wire the required models.
 */
const checkSubscription = (_req: Request, _res: Response, next: NextFunction) => {
  return next();
};

export default checkSubscription;
