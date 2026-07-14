import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema.Types;

/**
 * FryerOilLog — Preparation & Kitchen Operations Platform, Phase 7.
 *
 * Tracks one frying-oil lifecycle: installation (consumes fresh oil `StockItem` from inventory —
 * reuses the same posting path as ManualConsumption, since "putting fresh oil in a fryer" IS a
 * manual operational consumption, not a new concept), in-service quality checks, and discard.
 * Deliberately does NOT invent a second inventory-posting mechanism for the discard step — a
 * brand that wants the discarded oil's disposal cost tracked creates a `WasteRecord` (Phase 1,
 * reused) and links it here via `wasteRecord`, keeping this model's own job scoped to what's
 * genuinely oil-lifecycle-specific: cycles, quality, dates.
 */
const fryerOilLogSchema = new mongoose.Schema(
  {
    brand: { type: ObjectId, ref: "Brand", required: true },
    branch: { type: ObjectId, ref: "Branch", required: true },

    logNumber: { type: String, trim: true, maxlength: 100, required: true },

    warehouse: { type: ObjectId, ref: "Warehouse", required: true },
    station: { type: ObjectId, ref: "PreparationSectionConfig", required: true }, // the fryer station
    oilStockItem: { type: ObjectId, ref: "StockItem", required: true },

    quantityInstalled: { type: Number, min: 0.0001, default: null },
    unitCost: { type: Number, default: 0, min: 0 }, // resolved at install-posting time via the Cost Engine
    totalCost: { type: Number, default: 0, min: 0 },

    installedAt: { type: Date, default: null },
    installedBy: { type: ObjectId, ref: "Employee", default: null },

    status: {
      type: String,
      enum: ["Draft", "InUse", "Discarded", "Cancelled"],
      default: "Draft",
    },

    usageCycles: { type: Number, default: 0, min: 0 }, // number of frying batches since install

    qualityChecks: [
      {
        checkedAt: { type: Date, default: Date.now },
        checkedBy: { type: ObjectId, ref: "Employee", default: null },
        qualityRating: { type: String, enum: ["Good", "Fair", "Poor", "Unacceptable"], required: true },
        notes: { type: String, trim: true, maxlength: 300 },
      },
    ],

    discardedAt: { type: Date, default: null },
    discardedBy: { type: ObjectId, ref: "UserAccount", default: null },
    discardReason: {
      type: String,
      // `null` must be explicitly listed — Mongoose's enum validator rejects a literal `null`
      // otherwise, even as the field's own declared default (a recurring gotcha already hit and
      // fixed several times this engagement).
      enum: ["ScheduledChange", "QualityDegraded", "Contaminated", "Other", null],
      default: null,
    },
    // Optional link to a WasteRecord tracking the discarded oil's disposal — this model does not
    // post its own waste transaction, per the class comment above.
    wasteRecord: { type: ObjectId, ref: "WasteRecord", default: null },

    warehouseDocument: { type: ObjectId, ref: "WarehouseDocument", default: null }, // the install consumption

    createdBy: { type: ObjectId, ref: "UserAccount", required: true },
    updatedBy: { type: ObjectId, ref: "UserAccount", default: null },
  },
  { timestamps: true },
);

fryerOilLogSchema.index({ brand: 1, branch: 1, logNumber: 1 }, { unique: true });

export default mongoose.model("FryerOilLog", fryerOilLogSchema);
