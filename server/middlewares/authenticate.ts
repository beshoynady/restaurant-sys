import jwt from "jsonwebtoken";
import { NextFunction, Request, Response } from "express";

import User from "../modules/iam/user-account/user-account.model.js";
import throwError from "../utils/throwError.js";

/**
 * User Authentication Middleware (JWT)
 * =====================================
 * - Expects Authorization: Bearer <token>
 * - Verifies token using ACCESS_TOKEN_SECRET
 * - Loads user with role + employee populated
 *
 * notes:
 * - On failure, forwards an application error created by throwError.
 * - Adds user/brandId/branchId to the request for downstream middlewares/controllers.
 */
const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(throwError("Unauthorized", 401));
    }

    const token = authHeader.split(" ")[1];

    let payload: any;
    try {
      payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET as string);
    } catch {
      return next(throwError("Invalid or expired token", 403));
    }

    const user: any = await User.findById(payload.id)
      .populate("role")
      .populate("employee")
      .select("-password");

    if (!user || user.isDeleted) {
      return next(throwError("User not found", 404));
    }

    if (!user.isActive) {
      return next(throwError("User inactive", 403));
    }

    // Brand mismatch check
    if (user.brand.toString() !== payload.brand) {
      return next(throwError("Brand mismatch", 403));
    }

    // Request context contract:
    // BaseController/BaseService and most module controllers read
    // req.user.brandId / req.user.userId (not the raw Mongoose `brand`/`_id`
    // fields). Attach both aliases here, once, so every downstream consumer
    // gets a consistent context regardless of which property name it reads.
    (user as any).brandId = user.brand;
    (user as any).userId = user._id;
    (user as any).branchId = user.branch || null;

    // Attach to request
    (req as any).user = user;
    (req as any).brandId = user.brand;
    (req as any).branchId = user.branch || null;

    return next();
  } catch (err) {
    return next(err);
  }
};

export default authenticateToken;
