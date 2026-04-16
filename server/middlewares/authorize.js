/server/middlewares/authorize.js

import throwError from "../utils/throwError.js";

const authorize = (...permissions) => {
  return (req, res, next) => {
    const userPermissions = req.user.role?.permissions || [];

    const allowed = permissions.some((p) =>
      userPermissions.includes(p)
    );

    if (!allowed) {
      throw throwError("Forbidden", 403);
    }

    next();
  };
};

export default authorize;