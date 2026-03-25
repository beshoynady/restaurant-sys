import mongoose from "mongoose";
const { Schema } = mongoose;
const { ObjectId } = Schema.Types;

/**
 * User Account Model
 * ------------------
 * Handles authentication + authorization
 * Can be linked to an Employee OR standalone (Owner/Admin)
 */
const userAccountSchema = new Schema(
  {
    brand: { type: ObjectId, ref: "Brand", required: true },
    branch: { type: ObjectId, ref: "Branch", required: true },
    // Unique username per brand
    username: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      lowercase: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },

    phone: {
      type: String,
      trim: true,
      default: null,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },

    // Optional link to employee
    employee: {
      type: ObjectId,
      ref: "Employee",
      default: null,
    },

    // Role-based permissions
    role: {
      type: ObjectId,
      ref: "Role",
      default: null,
    },

    // Account status
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date, default: null },

    // Two Factor Auth
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String, default: "" },

    // Audit fields
    createdBy: { type: ObjectId, ref: "UserAccount", default: null },
    updatedBy: { type: ObjectId, ref: "UserAccount", default: null },

    // Soft delete
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: ObjectId, ref: "UserAccount", default: null },
  },
  { timestamps: true, versionKey: false }
);


// 🔥 Indexes (VERY IMPORTANT)
userAccountSchema.index({ brand: 1, username: 1 }, { unique: true });
userAccountSchema.index({ brand: 1, email: 1 }, { sparse: true });
userAccountSchema.index({ brand: 1, phone: 1 }, { sparse: true });

userAccountSchema.index({ employee: 1 });
userAccountSchema.index({ role: 1 });

export default mongoose.model("UserAccount", userAccountSchema);