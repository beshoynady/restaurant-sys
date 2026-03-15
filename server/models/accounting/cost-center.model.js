import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema.Types;

// Cost Center Schema

const costCenterSchema = new Schema(
  {
    brand: { type: ObjectId, ref: "Brand", required: true },
    branch: { type: ObjectId, ref: "Branch", default: null },

    name: { type: Map, of: {
    type: String,
    trim: true,
    minlength: 2,
    maxlength: 100
  },
 required: true },
    code: {
      type: String,
      uppercase: true,
      trim: true,
      required: true,
    },
    parent: { type: ObjectId, ref: "CostCenter", default: null },
    type: {
      type: String,
      enum: [
        "OPERATIONAL",
        "SUPPORT",
        "ADMIN",
        "FINANCIAL",
        "PROJECT",
        "DEPARTMENT",
        "OTHER",
      ],
      default: "OPERATIONAL",
    },

    isActive: { type: Boolean, default: true },
    createdBy: { type: ObjectId, ref: "Employee", required: true },
    updatedBy: { type: ObjectId, ref: "Employee", default: null },
  },
  { timestamps: true },
);

costCenterSchema.index({ brand: 1, code: 1 }, { unique: true });

const CostCenterModel = mongoose.model("CostCenter", costCenterSchema);

export default CostCenterModel;
