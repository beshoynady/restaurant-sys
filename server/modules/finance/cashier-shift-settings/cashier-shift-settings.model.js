import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema;

// Relocated from server/modules/hr/shift-settings/ (HR domain rollout,
// module 5 — confirmed with the project owner before moving). Every field
// here describes POS/cashier-till behavior (auto open/close, cash-variance
// tolerance) — zero relationship with `hr/shift` (staff work-shift
// scheduling templates), despite the former location and name. This is the
// exact conceptual surface of `finance/cashier-shift`, which is what this
// settings document is meant to configure. Registered model name changed
// from "ShiftSettings" to "CashierShiftSettings" for clarity; `collection`
// is pinned explicitly to the pre-existing physical collection name so no
// data migration was needed — see CASHIER_SHIFT_SETTINGS.module.md §13.
const CashierShiftSettingsSchema = new mongoose.Schema(
  {
    brand: { type: ObjectId, ref: "Brand", required: true },
    branch: { type: ObjectId, ref: "Branch", default: null },

    autoOpen: { type: Boolean, default: false },
    autoClose: { type: Boolean, default: true },

    allowNegativeCash: { type: Boolean, default: false },

    maxDifferenceAllowed: { type: Number, default: 50 },

    // Enterprise Finance Platform — CashierShift close-out engine: atomic, branch-scoped shift
    // numbering, mirroring OrderSettings.orderSequence's exact proven pattern (see
    // order-settings.service.js#getNextOrderNumber). No prefix/reset-daily fields — CashierShift's
    // own `num` field is a plain Number, not a formatted String, so nothing to format here.
    shiftSequence: {
      currentNumber: { type: Number, default: 0 },
    },

    createdBy: { type: ObjectId, ref: "UserAccount", default: null },
    updatedBy: { type: ObjectId, ref: "UserAccount", default: null },

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: ObjectId, ref: "UserAccount", default: null },
  },
  { timestamps: true, collection: "shiftsettings" },
);

// One settings document per brand+branch (branch: null = brand-wide)
CashierShiftSettingsSchema.index({ brand: 1, branch: 1 }, { unique: true });

export default mongoose.model("CashierShiftSettings", CashierShiftSettingsSchema);
