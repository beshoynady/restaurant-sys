import jwt from "jsonwebtoken";
import { NextFunction, Request, Response } from "express";

import OnlineCustomerModel from "../modules/crm/online-customer/online-customer.model.js";
import throwError from "../utils/throwError.js";

/**
 * Customer Authentication Middleware (JWT)
 * =========================================
 * - Expects Authorization: Bearer <token>
 * - Verifies token using ACCESS_TOKEN_SECRET
 * - Loads customer from OnlineCustomerModel
 *
 * notes:
 * - Adds customer + brandId to request for downstream usage.
 * - Uses throwError to standardize error creation.
 */
const authenticateCustomerToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(throwError("Unauthorized: Token not provided", 401));
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return next(throwError("Unauthorized: Token missing", 401));
    }

    let payload: any;
    try {
      payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET as string);
    } catch (err) {
      return next(throwError("Token expired or invalid", 403));
    }

    const customer: any = await OnlineCustomerModel.findById(payload.id).select(
      "-password -twoFactorSecret",
    );

    if (!customer) {
      return next(throwError("Customer not found", 404));
    }

    if (customer.isDeleted || !customer.isActive) {
      return next(throwError("Customer is inactive", 403));
    }

    (req as any).customer = customer;
    (req as any).brandId = customer.brand;

    return next();
  } catch (err) {
    return next(err);
  }
};

export default authenticateCustomerToken;
