//server/middlewares/authenticate-customer.js

import OnlineCustomerModel from "../modules/crm/online-customer/online-customer.model.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import throwError from "../utils/throwError.js";

dotenv.config();

const secretKey = process.env.JWT_SECRET_KEY;
const refreshSecretKey = process.env.JWT_REFRESH_SECRET;

/**
 * ============================================
 * 🔐 Authenticate Customer Access Token
 * ============================================
 */
const authenticateCustomerToken = async (req, res, next) => {
  try {
    const authHeader =
      req.headers.authorization || req.headers.Authorization;

    if (!authHeader) {
      throw throwError("Unauthorized: Token not provided", 401);
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      throw throwError("Unauthorized: Token missing", 401);
    }

    let payload;
    try {
      payload = jwt.verify(token, secretKey);
    } catch (err) {
      throw throwError("Token expired or invalid", 403);
    }

    const customer = await OnlineCustomerModel.findById(payload.id)
      .select("-password");

    if (!customer) {
      throw throwError("Customer not found", 404);
    }

    if (!customer.isActive || customer.isDeleted) {
      throw throwError("Customer is inactive", 403);
    }

    req.customer = customer;
    req.brandId = customer.brand;

    next();
  } catch (err) {
    next(err);
  }
};

export default authenticateCustomerToken;