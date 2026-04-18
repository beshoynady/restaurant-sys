import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema.Types;

/**
 * Service Charge Settings Schema
 * Represents service charge configurations for a brand or branch.
 */

const serviceChargeSchema = new mongoose.Schema(
  {
    brand: { type: ObjectId, ref: "Brand", required: true },
    branch: { type: ObjectId, ref: "Branch", default: null },
    // Is service charge enabled
    enabled: { type: Boolean, default: false },
    // Type of service charge
    type: {
      type: String,
      enum: ["PERCENTAGE", "FIXED"],
      default: "PERCENTAGE",
    },
    // Value of the service charge
    value: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Service types the charge
    appliesTo: {
      type: [String],
      enum: [
        "DINE_IN",
        "DELIVERY",
        "TAKEAWAY",
        "DRIVE_THRU",
        "CURBSIDE",
        "PICKUP",
        "OTHER",
      ],
      default: ["DINE_IN"],
    },
    note: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    // Calculation base for service charge
    calculationBase: {
      type: String,
      enum: ["BEFORE_TAX", "AFTER_TAX"],
      default: "BEFORE_TAX",
    },

    account: {
      type: ObjectId,
      ref: "Account",
      default: null,
    },
    createdBy: { type: ObjectId, ref: "UserAccount", required: true },
    updatedBy: { type: ObjectId, ref: "UserAccount", default: null },
  },
  { timestamps: true },
);

serviceChargeSchema.index({ brand: 1, branch: 1 }, { unique: true });

const ServiceChargeModel = mongoose.model("ServiceCharge", serviceChargeSchema);

export default ServiceChargeModel;
