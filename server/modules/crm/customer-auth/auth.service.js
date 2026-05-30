// server/modules/crm/online-customer/auth.service.js

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import throwError from "../../../utils/throwError.js";
import onlineCustomerModel from "../online-customer/online-customer.model.js";

const ACCESS_EXPIRE = process.env.ACCESS_TOKEN_EXPIRES || "15m";
const REFRESH_EXPIRE = process.env.REFRESH_TOKEN_EXPIRES || "7d";

/**
 * ==========================================
 * 🔐 Customer Auth Service
 * ==========================================
 */
class AuthService {
  // =========================
  // LOGIN
  // =========================
  async login({ identifier, password, brandId }) {
    if (!identifier || !password) {
      throw throwError("Identifier and password are required", 400);
    }

    const customer = await onlineCustomerModel
      .findOne({
        brand: brandId,
        isDeleted: false,
        $or: [
          { username: identifier },
          { email: identifier },
          { phone: identifier },
        ],
      })
      .select("+password")
      .populate("role")
      .populate("employee");

    if (!customer) {
      throw throwError("Invalid credentials", 401);
    }

    if (!customer.isActive) {
      throw throwError("User is inactive", 403);
    }

    const isMatch = await bcrypt.compare(password, customer.password);

    if (!isMatch) {
      throw throwError("Invalid credentials", 401);
    }

    customer.lastLogin = new Date();
    await customer.save();

    return {
      user: this.sanitize(customer),
      accessToken: this.generateAccessToken(customer),
      refreshToken: this.generateRefreshToken(customer),
    };
  }

  // =========================
  // REGISTER
  // =========================
  async register({ brandId, data, createdBy }) {
    const { username, email, phone, password } = data;

    if (!username || !password) {
      throw throwError("Username & password required", 400);
    }

    const exists = await onlineCustomerModel.findOne({
      brand: brandId,
      $or: [
        { username },
        ...(email ? [{ email }] : []),
        ...(phone ? [{ phone }] : []),
      ],
    });

    if (exists) {
      throw throwError("User already exists", 409);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const customer = await onlineCustomerModel.create({
      ...data,
      brand: brandId,
      password: hashedPassword,
      createdBy,
    });

    return this.sanitize(customer);
  }

  // =========================
  // REFRESH TOKEN
  // =========================
  async refresh(refreshToken) {
    if (!refreshToken) {
      throw throwError("Refresh token required", 400);
    }

    let payload;

    try {
      payload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    } catch {
      throw throwError("Invalid refresh token", 403);
    }

    const customer = await onlineCustomerModel.findById(payload.id);

    if (!customer || customer.isDeleted) {
      throw throwError("User not found", 404);
    }

    return {
      accessToken: this.generateAccessToken(customer),
    };
  }

  // =========================
  // ACCESS TOKEN
  // =========================
  generateAccessToken(customer) {
    return jwt.sign(
      {
        id: customer._id.toString(),
        brand: customer.brand.toString(),
        branch: customer.branch ? customer.branch.toString() : null,
        role: customer.role?.toString(),
      },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: ACCESS_EXPIRE },
    );
  }

  // =========================
  // REFRESH TOKEN
  // =========================
  generateRefreshToken(customer) {
    return jwt.sign(
      {
        id: customer._id.toString(),
        brand: customer.brand.toString(),
      },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: REFRESH_EXPIRE },
    );
  }

  // =========================
  // SANITIZE
  // =========================
  sanitize(customer) {
    const obj = customer.toObject();
    delete obj.password;
    delete obj.twoFactorSecret;
    return obj;
  }
}

export default new AuthService();
