// server/middlewares/authenticate-customer.js

import jwt from "jsonwebtoken";
import dotenv from "dotenv";

import OnlineCustomerModel from "../modules/crm/online-customer/online-customer.model.js";
import throwError from "../utils/throwError.js";

dotenv.config();

/**
 * ==========================================
 * 🔐 Customer Auth Middleware
 * ==========================================
 * Uses ACCESS_TOKEN_SECRET only
 */
const authenticateCustomerToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(throwError("Unauthorized: Token not provided", 401));
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return next(throwError("Unauthorized: Token missing", 401));
    }

    let payload;

    try {
      payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch (err) {
      return next(throwError("Token expired or invalid", 403));
    }

    const customer = await OnlineCustomerModel.findById(payload.id).select(
      "-password -twoFactorSecret",
    );

    if (!customer) {
      return next(throwError("Customer not found", 404));
    }

    if (customer.isDeleted || !customer.isActive) {
      return next(throwError("Customer is inactive", 403));
    }

    req.customer = customer;
    req.brandId = customer.brand;

    next();
  } catch (err) {
    next(err);
  }
};

export default authenticateCustomerToken;
