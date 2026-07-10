import { NextFunction, Request, Response } from "express";
import throwError from "../utils/throwError.js";

/**
 * RBAC Middleware (Resource + Action based)
 * =======================================
 * Usage:
 * authorize("UserAccounts", "create")
 *
 * notes:
 * - Expects req.user.role.permissions structure.
 * - Supports optional branch restriction (perm.branch).
 * - If permission is missing, forwards a 403 Forbidden error.
 */
const authorize =
  (resource: string, action: string) =>
  (req: Request, res: Response, next: NextFunction) => {
    const role: any = (req as any).user?.role;

    if (!role || !role.permissions) {
      return next(throwError("Forbidden", 403));
    }

    const permissions: any[] = role.permissions;

    const hasPermission = permissions.some((perm) => {
      const resourceMatch = perm.resource === resource;
      const actionAllowed = perm[action] === true;

      // optional branch restriction support
      const branchMatch =
        !perm.branch ||
        perm.branch.toString() === (role?.branch || (req as any).user?.branch)?.toString();

      return resourceMatch && actionAllowed && branchMatch;
    });

    if (!hasPermission) {
      return next(throwError("Forbidden", 403));
    }

    return next();
  };

export default authorize;
