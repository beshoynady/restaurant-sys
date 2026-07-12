// server/middlewares/authenticate.js

import jwt from "jsonwebtoken";

import User from "../modules/iam/user-account/user-account.model.js";
import throwError from "../utils/throwError.js";

/**
 * ==========================================
 * 🔐 User Authentication Middleware
 * ==========================================
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(throwError("Unauthorized", 401));
    }

    const token = authHeader.split(" ")[1];

    let payload;

    try {
      payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch {
      return next(throwError("Invalid or expired token", 403));
    }

    const user = await User.findById(payload.id)
      .populate("role")
      .populate("employee")
      .select("-password");

    if (!user || user.isDeleted) {
      return next(throwError("User not found", 404));
    }

    if (!user.isActive) {
      return next(throwError("User inactive", 403));
    }

    if (user.brand.toString() !== payload.brand) {
      return next(throwError("Brand mismatch", 403));
    }

    // Request context contract:
    // BaseController/BaseRepository and most module controllers read
    // req.user.brandId / req.user.userId (not the raw Mongoose `brand`/`_id`
    // fields). Attach both aliases here, once, so every downstream consumer
    // gets a consistent context regardless of which property name it reads.
    user.brandId = user.brand;
    user.userId = user._id;
    user.branchId = user.branch || null;

    req.user = user;
    req.brandId = user.brand;
    req.branchId = user.branch || null;

    next();
  } catch (err) {
    next(err);
  }
};

export default authenticateToken;
