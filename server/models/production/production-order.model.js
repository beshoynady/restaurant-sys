import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema;

const productionOrderSchema = new mongoose.Schema(
  {
    brand: {
      type: ObjectId,
      ref: "Brand",
      required: [true, "Brand is required"],
    },
    branch: {
      type: ObjectId,
      ref: "Branch",
      required: [true, "Branch is required"],
    },
    orderNumber: {
      type: String,
      required: [true, "Production number is required"],
    },
    productionType: {
      type: String,
      enum: ["store", "directUse", "display"],
      default: "store",
    },
    warehouse: {
      type: ObjectId,
      ref: "Warehouse",
      required: true,
    },
    preparationSection: {
      type: ObjectId,
      ref: "PreparationSection",
      required: [true, "preparation section is required"],
    },
    stockItem: {
      type: ObjectId,
      ref: "StockItem",
      required: [true, "Stock item is required"],
    },
    unit: {
      type: String,
      trim: true,
      required: [true, "Unit is required"],
    },
    quantityRequested: {
      type: Number,
      required: [true, "Quantity requested is required"],
      min: [1, "Quantity must be at least 1"],
    },
    plannedStartDate: {
      type: Date,
      required: [true, "Planned start date is required"],
    },
    plannedEndDate: {
      type: Date,
      required: [true, "Planned end date is required"],
    },
    priority: {
      type: String,
      enum: ["low", "normal", "high"],
      default: "normal", 
    },
    orderStatus: {
      type: String,
      enum: ["Pending", "approved", "rejected", "canceled"],
      default: "Pending",
    },
    notes: {
      type: String,
      trim: true,
      maxLength: 200,
    },
    createdBy: {
      type: ObjectId,
      ref: "UserAccount",
      required: [true, "Created by is required"],
    },
    updatedBy: {
      type: ObjectId,
      ref: "UserAccount",
    },
  },
  { timestamps: true },
);

export default mongoose.model("ProductionOrder", productionOrderSchema);
