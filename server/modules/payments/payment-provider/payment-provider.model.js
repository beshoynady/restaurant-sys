import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema.Types;

/**
 * PaymentProvider — Enterprise Payment Platform V1 rebuild.
 *
 * The previous `payment-provider.model.ts` was a bare stub (brand/name/code/isActive only,
 * confirmed by direct read — no credential, capability, or gateway link of any kind) with a
 * broken router import that would have crashed the app if it were ever mounted. It was never
 * mounted, never had a real writer, and is retired outright rather than migrated.
 *
 * A PaymentProvider is a BRAND's configured USE of a PaymentGateway — "Our Paymob Integration,"
 * not Paymob itself (that's the Gateway, shared platform-wide) and not a specific credentialed
 * account (that's MerchantAccount, one level down — a Provider can have several). This is the
 * layer `PaymentMethod.reference` (when `type: "PaymentProvider"`) actually points at: a business
 * payment method like "Visa" is backed by a Provider, and which specific MerchantAccount executes
 * a given transaction is resolved at payment time (branch/channel/register-aware), not baked
 * statically into the method.
 */
const PaymentProviderSchema = new mongoose.Schema(
  {
    brand: { type: ObjectId, ref: "Brand", required: true },

    // null = available brand-wide; set = restricted to one specific branch. This is the "Global
    // Provider / Brand Level / Branch Level" scoping the mission asked for, expressed the same way
    // every other brand/branch-scoped model in this codebase already expresses it — not a new
    // pattern invented for Payments.
    branch: { type: ObjectId, ref: "Branch", default: null },

    gateway: { type: ObjectId, ref: "PaymentGateway", required: true },

    name: {
      type: Map,
      of: { type: String, trim: true, minlength: 2, maxlength: 100 },
      required: true,
    },

    code: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 },

    // Fallback ordering among multiple Providers capable of backing the same PaymentMethod (e.g.
    // "try Paymob first, fall back to a manual bank-transfer provider if Paymob is down"). Lower
    // number = tried first — matches this codebase's existing `sortOrder`/`displayOrder`
    // convention (ascending = higher priority), not an arbitrary new direction.
    priority: { type: Number, default: 0 },

    // A restriction list, not an ownership field — `branch` above already says WHERE this
    // provider lives; `allowedChannels` says which ORDERING INTERFACES may use it once resolved
    // there. Empty array = no restriction (every channel may use it). Deliberately not modeled as
    // an `Order.channel`-shaped field: verified by direct read that `Order` has no such field
    // today (only `orderType`: DINE_IN/DELIVERY/TAKEAWAY/INTERNAL, a fulfillment mode, a different
    // concept from "which system took the order").
    allowedChannels: {
      type: [String],
      enum: [
        "POS", "SELF_ORDERING", "QR", "WEBSITE", "MOBILE", "DELIVERY",
        "CALL_CENTER", "MARKETPLACE", "KIOSK", "ADMIN_DASHBOARD",
      ],
      default: [],
    },

    isActive: { type: Boolean, default: true },

    // Distinct from isActive/isDeleted on purpose: "archived" is an admin's own end-of-life
    // decision on a provider they no longer use but want to keep for historical/reporting
    // reference (past transactions still need it to populate correctly) — different from
    // isActive (temporarily unavailable, expected to come back) and isDeleted (soft-delete
    // audit trail, not an operational state a user reasons about day to day).
    isArchived: { type: Boolean, default: false },

    notes: { type: String, trim: true, maxlength: 500 },

    createdBy: { type: ObjectId, ref: "UserAccount", required: true },
    updatedBy: { type: ObjectId, ref: "UserAccount", default: null },

    isDeleted: { type: Boolean, default: false },
    deletedBy: { type: ObjectId, ref: "UserAccount", default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

PaymentProviderSchema.index({ brand: 1, branch: 1, code: 1 }, { unique: true });
// Real query shape: "which providers can this branch's payment flow use, in priority order" —
// derived directly from how payment-provider.service.js#resolveForMethod queries below, not
// guessed ahead of a real caller existing.
PaymentProviderSchema.index({ brand: 1, branch: 1, isActive: 1, priority: 1 });

export default mongoose.model("PaymentProvider", PaymentProviderSchema);
