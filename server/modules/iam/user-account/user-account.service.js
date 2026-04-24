import bcrypt from "bcryptjs";
import UserAccountModel from "./user-account.model.js";
import AdvancedService from "../../../utils/AdvancedService.js";
import throwError from "../../../utils/throwError.js";

class UserAccountService extends AdvancedService {
  constructor() {
    super(UserAccountModel, {
      brandScoped: true,
      softDelete: true,
      defaultPopulate: ["brand", "branch", "employee", "role"],
      searchFields: ["username", "email", "phone"],
      defaultSort: { createdAt: -1 },
    });
  }

  // =========================
  // 🔐 CREATE USER (SECURED)
  // =========================
  async create(data, user) {

    // auto assign brand
    data.brand = user.brand;

    // auto assign creator
    data.createdBy = user._id;

    // normalize
    if (data.username) data.username = data.username.toLowerCase();
    if (data.email) data.email = data.email.toLowerCase();

    // hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);
    data.password = hashedPassword;

    // unique email check
    if (data.email) {
      const exists = await this.model.findOne({
        brand: data.brand,
        email: data.email,
      });
      if (exists) throwError("Email already exists", 400);
    }

    // unique phone check
    if (data.phone) {
      const exists = await this.model.findOne({
        brand: data.brand,
        phone: data.phone,
      });
      if (exists) throwError("Phone already exists", 400);
    }

    return super.create(data, user);
  }

  // =========================
  // ✏️ UPDATE
  // =========================
  async update(id, data, user) {
    const existing = await this.model.findById(id);
    if (!existing) throwError("User not found", 404);

    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }

    data.updatedBy = user._id;

    return super.update(id, data, user);
  }

  // =========================
  // 🗑️ DELETE SAFETY
  // =========================
  async hardDelete(id, user) {
    if (user._id.toString() === id) {
      throwError("You cannot delete yourself", 400);
    }
    return super.hardDelete(id, user);
  }

  async softDelete(id, user) {
    if (user._id.toString() === id) {
      throwError("You cannot delete yourself", 400);
    }
    return super.softDelete(id, user);
  }
}

export default new UserAccountService();