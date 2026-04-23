import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import throwError from "../../../utils/throwError.js";
import onlineCustomerModel from "../online-customer/online-customer.model.js";

const ACCESS_EXPIRE = "15m";
const REFRESH_EXPIRE = "7d";

class AuthService {
  // =========================
  // 🔐 LOGIN
  // =========================
  async login({ identifier, password, brandId }) {
    if (!identifier || !password) {
      throw throwError("Identifier and password are required", 400);
    }

    const onlineCustomer = await onlineCustomerModel.findOne({
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

    if (!onlineCustomer) throw throwError("Invalid credentials", 401);
    if (!onlineCustomer.isActive) throw throwError("User is inactive", 403);

    const match = await bcrypt.compare(password, onlineCustomer.password);
    if (!match) throw throwError("Invalid credentials", 401);

    onlineCustomer.lastLogin = new Date();
    await onlineCustomer.save();

    const accessToken = this.generateAccessToken(onlineCustomer);
    const refreshToken = this.generateRefreshToken(onlineCustomer);

    return {
      user: this.sanitize(onlineCustomer),
      accessToken,
      refreshToken,
    };
  }

  // =========================
  // 🆕 REGISTER (Admin)
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

    if (exists) throw throwError("User already exists", 409);

    const hashed = await bcrypt.hash(password, 10);

    const onlineCustomer = await onlineCustomerModel.create({
      ...data,
      brand: brandId,
      password: hashed,
      createdBy,
    });

    return this.sanitize(onlineCustomer);
  }

  // =========================
  // 🔄 REFRESH TOKEN
  // =========================
  async refresh(refreshToken) {
    let payload;

    try {
      payload = jwt.verify(refreshToken, process.env.JWT_SECRET);
    } catch {
      throw throwError("Invalid refresh token", 403);
    }

    const onlineCustomer = await onlineCustomerModel.findById(payload.id);

    if (!onlineCustomer || onlineCustomer.isDeleted) {
      throw throwError("User not found", 404);
    }

    return {
      accessToken: this.generateAccessToken(onlineCustomer),
    };
  }

  // =========================
  // 🔑 TOKENS
  // =========================
  generateAccessToken(onlineCustomer) {
    return jwt.sign(
      {
        id: onlineCustomer._id,
        brand: onlineCustomer.brand.toString(),
        branch: onlineCustomer.branch ? onlineCustomer.branch.toString() : null,
        role: onlineCustomer.role.toString(),
      },
      process.env.JWT_SECRET,
      { expiresIn: ACCESS_EXPIRE }
    );
  }

  generateRefreshToken(onlineCustomer) {
    return jwt.sign(
      {
        brand: onlineCustomer.brand.toString(),
        id: onlineCustomer._id,
      },
      process.env.JWT_SECRET,
      { expiresIn: REFRESH_EXPIRE }
    );
  }

  // =========================
  // 🧼 SANITIZE
  // =========================
  sanitize(onlineCustomer) {
    const obj = onlineCustomer.toObject();
    delete obj.password;
    delete obj.twoFactorSecret;
    return obj;
  }
}

export default new AuthService();