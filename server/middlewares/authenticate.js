//server/middlewares/authenticate.js
import jwt from "jsonwebtoken";
import User from "../modules/iam/user-account/user-account.model.js";
import throwError from "../utils/throwError.js";

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      throw throwError("Unauthorized", 401);
    }

    const token = authHeader.split(" ")[1];

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      throw throwError("Invalid or expired token", 403);
    }

    const user = await User.findById(payload.id)
      .populate("role")
      .populate("employee")
      .select("-password");

    if (!user || user.isDeleted) {
      throw throwError("User not found", 401);
    }

    if (!user.isActive) {
      throw throwError("User inactive", 403);
    }

    if (user.brand.toString() !== payload.brand) {
      throw throwError("Brand mismatch", 403);
    }

    req.user = user;
    req.brandId = user.brand;
    req.branchId = user.branch || null;

    next();
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      message: err.message,
    });
  }
};

export default authenticateToken;