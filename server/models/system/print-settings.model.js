const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const PrintSettingsSchema = new mongoose.Schema({
  branch: { type: ObjectId, ref: "Branch", required: true },

  printerType: {
    type: String,
    enum: ["THERMAL", "A4"],
    default: "THERMAL"
  },

  paperSize: { type: String, default: "80mm" },

  copies: {
    cashier: { type: Number, default: 1 },
    kitchen: { type: Number, default: 1 }
  },

  language: { type: String, enum: ["ar", "en"], default: "ar" },

  autoPrint: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model("PrintSettings", PrintSettingsSchema);
