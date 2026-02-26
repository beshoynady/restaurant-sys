const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const ConsumptionSchema = new mongoose.Schema({
  brand: {
    type: ObjectId,
    ref: "Brand", // isVirtual = true
    required: true,
  },
  branch: {
    type: ObjectId,
    ref: "Branch", // isVirtual = true
    required: true,
  },
  Warehouse: {
    type: ObjectId,
    ref: "Warehouse", // isVirtual = true
    required: true,
  },

  preparationSection: {
    type: ObjectId,
    ref: "PreparationSection", // The preparation section receiving the items (e.g., Kitchen, Bar).
    required: true,
  },

  shift: {
    type: ObjectId,
    ref: "Shift", // Morning / Evening / Night
    required: true,
  },

  openingStock: [
    {
      stockItem: {
        type: ObjectId,
        ref: "StockItem",
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
        default: 0,
      },
      unit: {
        type: String,
        default: "",
        require: true,
      },
    },
  ],

  receivedDuringShift: [
    {
      document: ObjectId, // WarehouseDocument
      stockItem: {
        type: ObjectId,
        ref: "StockItem",
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
        default: 0,
      },
      unit: {
        type: String,
        default: "",
        require: true,
      },
    },
  ],

  theoreticalConsumption: [
    {
      stockItem: {
        type: ObjectId,
        ref: "StockItem",
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
        default: 0,
      },
      unit: {
        type: String,
        default: "",
        require: true,
      }, // from recipes
    },
  ],

  actualClosingStock: [
    {
      stockItem: {
        type: ObjectId,
        ref: "StockItem",
        required: true,
      },
      quantity: Number,
      unit: {
        type: String,
        default: "",
        require: true,
      },
    },
  ],

  variance: [
    {
      stockItem: {
        type: ObjectId,
        ref: "StockItem",
        required: true,
      },
      difference: Number,
      unit: {
        type: String,
        default: "",
        require: true,
      },
      reason: {
        type: String,
        enum: ["waste", "loss", "overage"],
      },
    },
  ],

status: {
  type: String,
  enum: ["Open", "Closed", "Posted"],
  default: "Open"
},
  openedBy: {
    type: ObjectId,
    ref: "Employee",
    required: true,
  },
  openedAt: Date,
  closedAt: Date,

  closedBy: {
    type: ObjectId,
    ref: "Employee",
  },
});

const ConsumptionModel = mongoose.model("Consumption", ConsumptionSchema);

module.exports = ConsumptionModel;
