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
    name: [
      {
        lang: {
          type: String,
          enum: ["EN", "AR"],
        },
        value: {
          type: String,
          trim: true,
          minlength: 2,
          maxlength: 100,
           },
},

    ],

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

    balance: {
      type: Number,
      default: 0,
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
      ref: "UserAccount",
      required: true,
    },

    updatedBy: {
      type: ObjectId,
      ref: "UserAccount",
    },

    deletedBy: { type: ObjectId, ref: "UserAccount" },

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

const BankAccountModel = mongoose.model("BankAccount", bankAccountSchema);
export default BankAccountModel;
