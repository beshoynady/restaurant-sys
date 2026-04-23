import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import throwError from "../../utils/throwError.js";
import User from "./user-account.model.js";

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

    const user = await User.findOne({
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

    if (!user) throw throwError("Invalid credentials", 401);
    if (!user.isActive) throw throwError("User is inactive", 403);

    const match = await bcrypt.compare(password, user.password);
    if (!match) throw throwError("Invalid credentials", 401);

    user.lastLogin = new Date();
    await user.save();

    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    return {
      user: this.sanitize(user),
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

    const exists = await User.findOne({
      brand: brandId,
      $or: [
        { username },
        ...(email ? [{ email }] : []),
        ...(phone ? [{ phone }] : []),
      ],
    });

    if (exists) throw throwError("User already exists", 409);

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      ...data,
      brand: brandId,
      password: hashed,
      createdBy,
    });

    return this.sanitize(user);
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

    const user = await User.findById(payload.id);

    if (!user || user.isDeleted) {
      throw throwError("User not found", 404);
    }

    return {
      accessToken: this.generateAccessToken(user),
    };
  }

  // =========================
  // 🔑 TOKENS
  // =========================
  generateAccessToken(user) {
    return jwt.sign(
      {
        id: user._id,
        brand: user.brand.toString(),
        branch: user.branch ? user.branch.toString() : null,
        role: user.role.toString(),
      },
      process.env.JWT_SECRET,
      { expiresIn: ACCESS_EXPIRE }
    );
  }

  generateRefreshToken(user) {
    return jwt.sign(
      {
        brand: user.brand.toString(),
        id: user._id,
      },
      process.env.JWT_SECRET,
      { expiresIn: REFRESH_EXPIRE }
    );
  }

  // =========================
  // 🧼 SANITIZE
  // =========================
  sanitize(user) {
    const obj = user.toObject();
    delete obj.password;
    delete obj.twoFactorSecret;
    return obj;
  }
}

export default new AuthService();