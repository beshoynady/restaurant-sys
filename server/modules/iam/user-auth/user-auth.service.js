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
  async login({ identifier, password }) {

    if (!identifier || !password) {
      throwError("Identifier and password are required", 400);
    }

    const user = await User.findOne({
      isDeleted: false,
      isActive: true,
      $or: [
        { username: identifier.toLowerCase() },
        { email: identifier.toLowerCase() },
        { phone: identifier },
      ],
    }).select("+password");
    console.log(user);
    if (!user) throwError("Invalid credentials", 401);

    const match = await bcrypt.compare(password, user.password);
    if (!match) throwError("Invalid credentials", 401);
    console.log("User authenticated successfully:", user.username);
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
      id: user._id.toString(),
      brand: user.brand?.toString(),
      role: user.role?.toString(),
      branch: user.branch?.toString(),
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: ACCESS_EXPIRE }
  );
};

  // =========================
  // 🔑 REFRESH TOKEN
  // =========================
generateRefreshToken(user) {
  return jwt.sign(
    {
      id: user._id.toString(),
      brand: user.brand?.toString(),
    },
    process.env.REFRESH_TOKEN_SECRET,
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