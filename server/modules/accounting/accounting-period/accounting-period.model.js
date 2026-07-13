import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema;

const accountingPeriodSchema = new mongoose.Schema(
  {
    brand: {
      type: ObjectId,
      ref: "Brand",
      required: true,
    },
    name: { type: Map, of: {
    type: String,
    trim: true,
    minlength: 2,
    maxlength: 100
  },
 required: true },
    
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    /* period start and end dates
     * ex: Jan 1, 2024 - Dec 31, 2024
     */

    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },

    // created by employee reference
    createdBy: { type: ObjectId, ref: "UserAccount", required: true },

    status: { type: String, enum: ["Open", "Closed"], default: "Open" },
    closedBy: { type: ObjectId, ref: "UserAccount", default: null },
    closedAt: { type: Date, default: null },
    isLocked: { type: Boolean, default: false },

    // PLATFORM_FINAL_AUDIT.md PA-01
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: ObjectId, ref: "UserAccount", default: null },
  },
  { timestamps: true },
);

accountingPeriodSchema.index({ brand: 1, name: 1 }, { unique: true });

const AccountingPeriod = mongoose.model(
  "AccountingPeriod",
  accountingPeriodSchema,
);
export default AccountingPeriod;
