import { NextFunction, Request, Response } from "express";

/**
 * Not Found middleware.
 * Creates an Error with the current originalUrl and forwards it to the error handler.
 *
 * notes:
 * - This should be mounted after all routes so it catches unmatched requests.
 */
const notFound = (req: Request, res: Response, next: NextFunction) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

export default notFound;
