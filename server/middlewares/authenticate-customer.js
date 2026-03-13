import OnlineCustomerModel from "../models/customers/online-customer.model.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const secretKey = process.env.JWT_SECRET_KEY;
const refreshSecretKey = process.env.JWT_REFRESH_SECRET;

/**
 * Middleware: Authenticate access token
 */
const authenticateCustomerToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader) {
      return res.status(401).json({ message: "Unauthorized: Token not provided" });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Unauthorized: Token missing" });
    }

    // Verify token
    let payload;
    try {
      payload = jwt.verify(token, secretKey);
    } catch (err) {
      return res.status(403).json({ message: "Forbidden: Invalid or expired token" });
    }

    // Fetch customer from DB
    const customer = await OnlineCustomerModel.findById(payload.id);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // Check permissions
    if (!customer.isActive) {
      return res.status(403).json({ message: "Forbidden: Customer is not active" });
    }

    req.customer = customer;
    next();
  } catch (err) {
    console.error("Authentication error:", err);
    return res.status(500).json({ message: "Server error during authentication" });
  }
};

/**
 * Generate a new Access Token using HttpOnly refresh token cookie
 */
const generateNewCustomerAccessToken = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) return res.status(401).json({ message: "No refresh token" });

    const payload = jwt.verify(token, refreshSecretKey);

    const customer = await OnlineCustomerModel.findById(payload.id);
    if (!customer || customer.refreshToken !== token) {
      return res.status(403).json({ message: "Invalid refresh token" });
    }

    const newAccessToken = jwt.sign(
      { brand: customer.brand,
        id: customer._id 
      },
      secretKey,
      { expiresIn: "15m" }
    );
    res.json({ accessToken: newAccessToken });
  } catch (err) {
    console.error("Generate access token error:", err);
    res.status(403).json({ message: "Invalid refresh token" });
  }
};

export  {
  authenticateCustomerToken,
  generateNewCustomerAccessToken,
};
