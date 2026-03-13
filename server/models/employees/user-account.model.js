import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema;

/**
 * User Account Model
 * Contains login credentials, roles, and permissions for system access.
 */
const userAccountSchema = new mongoose.Schema(
  {
    brand: { type: ObjectId, ref: "Brand", required: true },
    branch: { type: ObjectId, ref: "Branch", default: null },

    employee: { type: ObjectId, ref: "Employee", required: true },
    username: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },
    password: {
      type: String,
      required: true,
      trim: true,
      minlength: 6,
      maxlength: 50,
      select: false,
    },

    permissions: {
      type: ObjectId,
      ref: "Permissions",
      default: null,
    }, // Reference to Permissions document for fine-grained access control

    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date, default: null },

    //tow factor authentication fields
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String, trim: true, default: "" },

    createdBy: { type: ObjectId, ref: "Employee", required: true },
    updatedBy: { type: ObjectId, ref: "Employee", default: null },

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: ObjectId, ref: "Employee", default: null },
  },
  { timestamps: true, versionKey: false },
);

// Unique constraint per employee & username
userAccountSchema.index({ username: 1 }, { unique: true });

const UserAccount = mongoose.model("UserAccount", userAccountSchema);
export UserAccount;
