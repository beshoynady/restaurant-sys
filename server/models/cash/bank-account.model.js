import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema;

/**
 * BankAccount Model
 * -----------------
 * Represents real bank accounts
 */
const bankAccountSchema = new mongoose.Schema(
  {
    brand: {
      type: ObjectId,
      ref: "Brand",
      required: true,
    },
    branch: {
      type: ObjectId,
      ref: "Branch",
      default: null,
    },
    // employee who owns this account (for employee custody type)
    employee: {
      type: ObjectId,
      ref: "Employee",
      required: true,
    },
    name: {
      type: Map,
      of: {
        type: String,
        trim: true,
        minlength: 2,
        maxlength: 100,
      },
      required: true,
      trim: true,
    },

    bankName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    branchName: {
      type: String,
      trim: true,
      maxlength: 100,
    },

    accountNumber: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },

    iban: {
      type: String,
      trim: true,
      maxlength: 34,
    },

    swiftCode: {
      type: String,
      trim: true,
      maxlength: 11,
    },

    currency: {
      type: String,
      required: true,
      trim: true,
      maxlength: 10,
    },

    type: {
      type: String,
      enum: ["checking", "savings", "credit", "other"],
      required: true,
    },

    /**
     * GL Account (important)
     */
    accountId: {
      type: ObjectId,
      ref: "Account",
      required: true,
    },

    status: {
      type: String,
      enum: ["active", "inactive", "closed"],
      default: "active",
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    createdBy: {
      type: ObjectId,
      ref: "Employee",
      required: true,
    },

    updatedBy: {
      type: ObjectId,
      ref: "Employee",
    },

    deletedBy: {
      type: ObjectId,
      ref: "Employee",
    },

    deletedAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

/**
 * Indexes
 */
bankAccountSchema.index({ brand: 1, accountNumber: 1 }, { unique: true });

export default mongoose.model("BankAccount", bankAccountSchema);
