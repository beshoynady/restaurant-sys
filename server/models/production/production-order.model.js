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
      default: null,
    },
    orderNumber: {
      type: Number,
      required: [true, "Production number is required"],
    },
    productionType: {
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
    priority: { enum: ["low", "normal", "high"] },
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
      ref: "Employee",
      required: [true, "Created by is required"],
    },
    updatedBy: {
      type: ObjectId,
      ref: "Employee",
    },
  },
  { timestamps: true },
);

export mongoose.model("ProductionOrder", productionOrderSchema);
