import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema.Types;

/**
 * PaymentGateway — Enterprise Payment Platform V1.
 *
 * The Strategy Pattern's registry entry: `code` is the key an adapter-resolver service maps to
 * real integration code (a class implementing authorize/capture/refund/void against Paymob's
 * actual API, Stripe's actual API, etc.). This model is deliberately just the CATALOG/DEFINITION
 * of a gateway — what it's called, what it can do, what credentials it needs — never the
 * merchant's own account details. That's `MerchantAccount`'s job (a separate model, one level
 * down), because one Gateway definition ("Paymob") is shared by every merchant who uses Paymob,
 * while each merchant's actual API keys are theirs alone.
 *
 * `brand: null` means a platform-wide, globally-available gateway (Paymob, Stripe, Fawry, Manual —
 * shipped and maintained by this platform's own engineering team). A non-null `brand` scopes a
 * gateway definition to one tenant only — the escape hatch for a merchant's own bespoke/local
 * integration that isn't, and will never be, a platform-supported adapter.
 */
const PaymentGatewaySchema = new mongoose.Schema(
  {
    brand: { type: ObjectId, ref: "Brand", default: null },

    // The Strategy Pattern key. A real adapter class is resolved by this exact string
    // (see payment-gateway-adapter-registry.js, built in a later phase) — changing it after
    // merchants have configured Providers against it would silently orphan their configuration,
    // so it's immutable once set, not just conventionally stable.
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 40,
      match: /^[A-Z0-9_]+$/,
      immutable: true,
    },

    name: {
      type: Map,
      of: { type: String, trim: true, minlength: 2, maxlength: 100 },
      required: true,
    },

    description: {
      type: Map,
      of: { type: String, trim: true, maxlength: 500 },
      default: undefined,
    },

    // How a customer/cashier actually interacts with this gateway. Multi-select, not a single
    // enum — a real provider (e.g. Paymob) commonly supports several of these at once (a hosted
    // checkout page for online orders AND a POS-terminal SDK for in-store cards).
    integrationModes: {
      type: [String],
      enum: [
        "HOSTED_PAYMENT", "EMBEDDED", "POS_TERMINAL", "QR", "DEEP_LINK",
        "PAYMENT_LINK", "WEBHOOK", "SDK", "API", "MANUAL",
      ],
      default: [],
    },

    // Business logic MUST branch on these flags, never on `code === "PAYMOB"` — this is the whole
    // point of the capability-driven design the mission asked for. A capability a gateway doesn't
    // declare is a capability the UI never offers and the service layer never attempts.
    capabilities: {
      type: [String],
      enum: [
        "REFUND", "PARTIAL_REFUND", "VOID", "CAPTURE", "PARTIAL_CAPTURE", "AUTHORIZATION",
        "TOKENIZATION", "RECURRING", "INSTALLMENTS", "QR", "THREE_DS", "OFFLINE", "ONLINE",
        "SPLIT_TENDER", "TIPS", "SIGNATURE", "EMV", "NFC", "WEBHOOK", "POLLING",
      ],
      default: [],
    },

    // Dynamic credential form metadata — this is what lets an admin configure a brand-new
    // MerchantAccount for this gateway without a single line of frontend/backend code changing.
    // `secret: true` fields are the ones MerchantAccount encrypts at rest and never returns
    // decrypted through a normal read endpoint (see utils/secretEncryption.js).
    credentialSchema: [
      {
        _id: false,
        key: { type: String, required: true, trim: true, maxlength: 60 },
        label: {
          type: Map,
          of: { type: String, trim: true, maxlength: 100 },
          required: true,
        },
        type: {
          type: String,
          enum: ["text", "secret", "select", "url", "number", "boolean"],
          required: true,
        },
        required: { type: Boolean, default: true },
        secret: { type: Boolean, default: false },
        options: { type: [String], default: undefined }, // only meaningful when type === "select"
        placeholder: { type: String, trim: true, maxlength: 200 },
      },
    ],

    // Empty array means "no currency restriction" — most local gateways (Paymob, Fawry) only
    // support EGP; a global gateway (Stripe) supports many. An empty list is deliberately NOT the
    // same as "supports nothing" here, matching how an empty `cuisineType`/`dashboardLanguages`
    // array elsewhere in this codebase would be a data-entry bug, not a real "supports nothing"
    // state — the emptiness convention differs per field and is documented per-field on purpose.
    supportedCurrencies: { type: [String], default: [] },

    // False for a future, not-yet-built "generic REST adapter" that lets a merchant configure a
    // completely custom integration from data alone (URL templates, field mappings) with no real
    // adapter code behind it — named here so the schema has a place for it later, not built now
    // (a generic, config-driven HTTP integration engine is genuinely new, unscoped work; see the
    // Engineering Review's Risk 3).
    isSystemGateway: { type: Boolean, default: true },

    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },

    createdBy: { type: ObjectId, ref: "UserAccount", required: true },
    updatedBy: { type: ObjectId, ref: "UserAccount", default: null },

    isDeleted: { type: Boolean, default: false },
    deletedBy: { type: ObjectId, ref: "UserAccount", default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// A gateway `code` is unique within its scope: two different brands may both register their own
// "CUSTOM_REST" gateway, but a single brand (or the platform-wide null-brand catalog) can never
// have two gateways claiming the same code — that would make the Strategy Pattern's own registry
// key ambiguous.
PaymentGatewaySchema.index({ brand: 1, code: 1 }, { unique: true });

export default mongoose.model("PaymentGateway", PaymentGatewaySchema);
