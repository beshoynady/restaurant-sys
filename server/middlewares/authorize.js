import throwError from "../utils/throwError.js";

/**
 * RBAC Middleware (Resource + Action based)
 * Example:
 * authorize("UserAccounts", "create")
 */
const authorize = (resource, action) => {
  return (req, res, next) => {
    const role = req.user?.role;

    if (!role || !role.permissions) {
      return next(throwError("Forbidden", 403));
    }

    const permissions = role.permissions;

    const hasPermission = permissions.some((perm) => {
      const resourceMatch = perm.resource === resource;
      const actionAllowed = perm[action] === true;

      // optional branch restriction support
      const branchMatch =
        !perm.branch ||
        perm.branch.toString() === req.user.branch?.toString();

      return resourceMatch && actionAllowed && branchMatch;
    });

    if (!hasPermission) {
      return next(throwError("Forbidden", 403));
    }

    next();
  };
};

export default authorize;