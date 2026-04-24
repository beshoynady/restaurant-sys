import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import throwError from "../../../utils/throwError.js";
import User from "../user-account/user-account.model.js";

const ACCESS_EXPIRE = "15m";
const REFRESH_EXPIRE = "7d";

class AuthService {
  // =========================
  // 🔐 LOGIN
  // =========================
  async login({ identifier, password, brandId }) {
    if (!identifier || !password) {
      throwError("Identifier and password are required", 400);
    }

    const user = await User.findOne({
      brand: brandId,
      isDeleted: false,
      isActive: true,
      $or: [
        { username: identifier.toLowerCase() },
        { email: identifier.toLowerCase() },
        { phone: identifier },
      ],
    }).select("+password");

    if (!user) throwError("Invalid credentials", 401);

    const match = await bcrypt.compare(password, user.password);
    if (!match) throwError("Invalid credentials", 401);

    // update last login
    user.lastLogin = new Date();
    await user.save();

    return {
      user: this.sanitize(user),
      accessToken: this.generateAccessToken(user),
      refreshToken: this.generateRefreshToken(user),
    };
  }

  // =========================
  // 🔄 REFRESH TOKEN
  // =========================
  async refresh(token) {
    if (!token) {
      throwError("Refresh token required", 400);
    }

    let payload;

    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      throwError("Invalid refresh token", 403);
    }

    const user = await User.findOne({
      _id: payload.id,
      isDeleted: false,
      isActive: true,
    });

    if (!user) throwError("User not found", 404);

    return {
      accessToken: this.generateAccessToken(user),
    };
  }

  // =========================
  // 🔑 ACCESS TOKEN
  // =========================
  generateAccessToken(user) {
    return jwt.sign(
      {
        id: user._id,
        brand: user.brand,
        role: user.role,
        branch: user.branch,
      },
      process.env.JWT_SECRET,
      { expiresIn: ACCESS_EXPIRE }
    );
  }

  // =========================
  // 🔑 REFRESH TOKEN
  // =========================
  generateRefreshToken(user) {
    return jwt.sign(
      {
        id: user._id,
        brand: user.brand,
      },
      process.env.JWT_SECRET,
      { expiresIn: REFRESH_EXPIRE }
    );
  }

  // =========================
  // 🧼 SANITIZE USER
  // =========================
  sanitize(user) {
    const obj = user.toObject();

    delete obj.password;
    delete obj.twoFactorSecret;
    delete obj.resetPasswordToken;
    delete obj.resetPasswordExpires;

    return obj;
  }
}

export default new AuthService();