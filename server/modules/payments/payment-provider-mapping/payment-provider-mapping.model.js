import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema.Types;

/**
 * PaymentProviderMapping — Enterprise Payment Platform V1 Phase 2.
 *
 * `PaymentMethod.reference` (when `type: "PaymentProvider"`) is a single, fixed pointer — good
 * enough for "Visa always goes through Paymob," useless for "Visa goes through Paymob, but fall
 * back to our Stripe integration if Paymob is unavailable for this branch." This model is that
 * missing many-to-many layer: which Providers are eligible to back a given PaymentMethod, ranked
 * by priority, optionally scoped narrower than the method itself (a method can be brand-wide while
 * one specific branch overrides its provider ranking).
 *
 * Deliberately additive, not a replacement for `PaymentMethod.reference` — a method with no
 * mapping at all still resolves through its own `reference` exactly as it did in Phase 1 (see
 * payment-method-resolution.service.js#_getRankedProviders). This is the same "richer optional
 * layer, cheap default stays working" shape this codebase already uses for
 * PreparationSettings.return.decisionBy (configured -> enforced, unconfigured -> fails open to the
 * simpler existing behavior) — not a new pattern invented for Payments.
 */
const PaymentProviderMappingSchema = new mongoose.Schema(
  {
    brand: { type: ObjectId, ref: "Brand", required: true },

    // null = applies brand-wide; set = this branch's own override ranking for the same method.
    branch: { type: ObjectId, ref: "Branch", default: null },

    paymentMethod: { type: ObjectId, ref: "PaymentMethod", required: true },
    provider: { type: ObjectId, ref: "PaymentProvider", required: true },

    // Ascending = tried first, same convention as PaymentProvider.priority/MerchantAccount.priority
    // one level up and one level down — a deliberately consistent direction across this whole
    // hierarchy so an admin never has to remember "which layer counts up vs. down."
    priority: { type: Number, default: 0 },

    isActive: { type: Boolean, default: true },

    createdBy: { type: ObjectId, ref: "UserAccount", required: true },
    updatedBy: { type: ObjectId, ref: "UserAccount", default: null },

    isDeleted: { type: Boolean, default: false },
    deletedBy: { type: ObjectId, ref: "UserAccount", default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// A given (method, provider) pair is ranked at most once per scope — an admin can't accidentally
// give the same provider two different priorities under the same method/branch.
PaymentProviderMappingSchema.index({ brand: 1, branch: 1, paymentMethod: 1, provider: 1 }, { unique: true });
// The real query shape the resolution engine actually runs: "every ranked provider for this
// method, in this scope, in priority order."
PaymentProviderMappingSchema.index({ brand: 1, branch: 1, paymentMethod: 1, isActive: 1, priority: 1 });

export default mongoose.model("PaymentProviderMapping", PaymentProviderMappingSchema);
