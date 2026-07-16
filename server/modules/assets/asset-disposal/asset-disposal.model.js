import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema;

/**
 * AssetDisposal Schema
 * --------------------
 * Represents the single, terminal disposal event for an asset — scrapping (write-off, no
 * proceeds) or selling (proceeds, possible gain/loss). Mirrors `AssetDepreciation`'s own audit-
 * trail discipline: this model DOES NOT decide whether an asset should be disposed or compute
 * anything beyond what it's given — `asset-disposal.service.js` computes gain/loss and posts the
 * accounting; this collection only stores the immutable RESULT, exactly like AssetDepreciation
 * does for period depreciation. Unlike AssetDepreciation there is no Draft/Posted staging: a
 * disposal is a single, deliberate, one-time transaction — approving IS posting, matching the
 * convention already established platform-wide (WasteRecord, ManualConsumption, GoodsReceiptNote).
 */
const assetDisposalSchema = new mongoose.Schema(
  {
    brand: { type: ObjectId, ref: "Brand", required: true },
    branch: { type: ObjectId, ref: "Branch", required: true },

    asset: { type: ObjectId, ref: "Asset", required: true, index: true },

    disposalType: {
      type: String,
      enum: ["Scrap", "Sale"],
      required: true,
    },

    disposalDate: { type: Date, required: true },

    // Immutable snapshot of the asset's financial state AT THE MOMENT of disposal — never
    // recomputed later, exactly like AssetDepreciation's own `amount` is a snapshot, not a live
    // formula. Needed because Asset.purchaseCost/accumulatedDepreciation/bookValue can still be
    // read after disposal, but this record must remain a faithful account of what those values
    // WERE when the disposal actually happened.
    purchaseCostAtDisposal: { type: Number, required: true, min: 0 },
    accumulatedDepreciationAtDisposal: { type: Number, required: true, min: 0 },
    bookValueAtDisposal: { type: Number, required: true, min: 0 },

    // Cash/proceeds received — always 0 for Scrap, required to be validated > 0 by the service for
    // Sale (a $0 "sale" is really a scrap and should be recorded as one).
    saleProceeds: { type: Number, default: 0, min: 0 },

    // Where the sale proceeds landed — mirrors DailyExpense.paid[]'s exact dual cashRegister/
    // bankAccount settlement pattern. Both null for a Scrap (nothing was received).
    cashRegister: { type: ObjectId, ref: "CashRegister", default: null },
    bankAccount: { type: ObjectId, ref: "BankAccount", default: null },

    // Positive = gain, negative = loss, zero = proceeds exactly matched book value. Always
    // negative (a full write-off of remaining book value) for a Scrap with any remaining value.
    gainLoss: { type: Number, required: true },

    reason: { type: String, trim: true, maxlength: 300, default: null },

    journalEntry: { type: ObjectId, ref: "JournalEntry", default: null },

    createdBy: { type: ObjectId, ref: "UserAccount", required: true },
  },
  { timestamps: true },
);

// An asset can only be disposed of once — its own Asset.status (Disposed/Sold) is the primary
// guard (enforced in the service via an atomic claim), this unique index is the hard backstop
// against a genuine race producing two disposal records for the same asset.
assetDisposalSchema.index({ asset: 1 }, { unique: true });
assetDisposalSchema.index({ brand: 1, branch: 1, disposalDate: -1 });

const AssetDisposalModel = mongoose.model("AssetDisposal", assetDisposalSchema);

export default AssetDisposalModel;
