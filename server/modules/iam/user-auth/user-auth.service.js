import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import throwError from "../../../utils/throwError.js";
import { signAccessToken, signRefreshToken } from "../../../utils/jwt.utils.js";
import User from "../user-account/user-account.model.js";

class AuthService {
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

    if (!user) throwError("Invalid credentials", 401);

    const match = await bcrypt.compare(password, user.password);
    if (!match) throwError("Invalid credentials", 401);

    user.lastLogin = new Date();
    await user.save();

    return {
      user: this.sanitize(user),
      accessToken: signAccessToken(user),
      refreshToken: signRefreshToken(user),
    };
  }

  async refresh(token) {
    if (!token) throwError("Refresh token required", 400);

    let payload;

    try {
      payload = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    } catch {
      throwError("Invalid refresh token", 403);
    }

    const user = await User.findById(payload.id);

    if (!user || user.isDeleted) {
      throwError("User not found", 404);
    }

    if (!user.isActive) {
      throwError("User inactive", 403);
    }

    return {
      accessToken: signAccessToken(user),
    };
  }

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