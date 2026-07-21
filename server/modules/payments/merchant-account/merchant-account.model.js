import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema.Types;

/**
 * MerchantAccount — Enterprise Payment Platform V1.
 *
 * The actual credentialed account under a PaymentProvider. A single Provider ("Our Paymob
 * Integration") can own several of these — "2 Stripe accounts, 4 Paymob accounts, different
 * accounts per branch/country" is exactly this model's reason to exist as its own layer instead
 * of folding credentials directly onto PaymentProvider.
 *
 * Every field a real gateway integration needs (API Key, Secret, Merchant ID, Terminal ID,
 * Webhook Secret, ...) is intentionally NOT hardcoded here as named schema fields — the set of
 * fields a gateway needs is declared once, on `PaymentGateway.credentialSchema`, and this model
 * stores whatever that schema asks for, generically. Adding support for a brand-new gateway's
 * different credential shape therefore never requires a schema migration on this model.
 */
const MerchantAccountSchema = new mongoose.Schema(
  {
    brand: { type: ObjectId, ref: "Brand", required: true },

    provider: { type: ObjectId, ref: "PaymentProvider", required: true },

    name: {
      type: Map,
      of: { type: String, trim: true, minlength: 2, maxlength: 100 },
      required: true,
    },

    environment: {
      type: String,
      enum: ["sandbox", "production"],
      default: "sandbox",
      required: true,
    },

    // Non-secret credential values (Merchant ID, Integration ID, a public/publishable key —
    // anything safe to return in a normal API response). Keyed by `PaymentGateway.credentialSchema[].key`.
    credentialValues: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Secret credential values (API Key, Secret Key, Webhook Signing Secret) — each individually
    // AES-256-GCM encrypted via utils/secretEncryption.js at write time, never stored in
    // plaintext, never returned decrypted by a normal read (see merchant-account.service.js's
    // toSafeJSON()). Modeled as an array, not a Map, because the IV must be unique PER FIELD PER
    // WRITE (reusing an IV across fields encrypted with the same key breaks GCM's guarantee) —
    // an array of independently-encrypted entries makes that a natural, visible shape rather than
    // something that could be accidentally shared across a Map's values.
    secretCredentials: [
      {
        _id: false,
        key: { type: String, required: true, trim: true, maxlength: 60 },
        ciphertext: { type: String, required: true },
        iv: { type: String, required: true },
        authTag: { type: String, required: true },
      },
    ],

    callbackUrls: {
      successUrl: { type: String, trim: true, maxlength: 500 },
      failureUrl: { type: String, trim: true, maxlength: 500 },
    },

    // How long a token this provider issues (e.g. an OAuth access token for a gateway that uses
    // token-based auth instead of static API keys) stays valid before a refresh is needed. Null =
    // not applicable to this gateway's auth model — most static-API-key gateways never set this.
    tokenLifetimeSeconds: { type: Number, default: null, min: 1 },

    timeoutSeconds: { type: Number, default: 30, min: 1, max: 300 },
    maxRetries: { type: Number, default: 3, min: 0, max: 10 },

    // Restriction lists — empty means unrestricted at that dimension. Deliberately three separate
    // arrays, not one combined "scope" object, because each dimension is independently optional:
    // a merchant account can be branch-restricted without being register-restricted, and vice versa.
    allowedBranches: { type: [ObjectId], ref: "Branch", default: [] },
    allowedCashRegisters: { type: [ObjectId], ref: "CashRegister", default: [] },
    allowedChannels: {
      type: [String],
      enum: [
        "POS", "SELF_ORDERING", "QR", "WEBSITE", "MOBILE", "DELIVERY",
        "CALL_CENTER", "MARKETPLACE", "KIOSK", "ADMIN_DASHBOARD",
      ],
      default: [],
    },

    // IP addresses/CIDR blocks a provider's webhook calls are expected to originate from — an
    // additional signature-independent check for providers that publish a fixed IP range (several
    // real gateways do). Empty = not enforced (signature validation alone still applies).
    ipWhitelist: { type: [String], default: [] },

    // Fallback ordering among sibling MerchantAccounts under the same Provider — same ascending-
    // priority convention as PaymentProvider.priority, one level down.
    priority: { type: Number, default: 0 },

    isActive: { type: Boolean, default: true },
    isArchived: { type: Boolean, default: false },

    // Set once an admin has actually exercised "Test Connection" against this account and the
    // provider confirmed the credentials work — distinct from isActive (an admin's own toggle) so
    // the UI can honestly show "configured but never verified" as a third state, not silently
    // conflate it with "verified and working."
    lastVerifiedAt: { type: Date, default: null },
    lastVerificationStatus: {
      type: String,
      enum: ["never_tested", "success", "failed"],
      default: "never_tested",
    },

    notes: { type: String, trim: true, maxlength: 500 },

    createdBy: { type: ObjectId, ref: "UserAccount", required: true },
    updatedBy: { type: ObjectId, ref: "UserAccount", default: null },

    isDeleted: { type: Boolean, default: false },
    deletedBy: { type: ObjectId, ref: "UserAccount", default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

MerchantAccountSchema.index({ brand: 1, provider: 1, priority: 1 });
MerchantAccountSchema.index({ brand: 1, provider: 1, environment: 1 });

export default mongoose.model("MerchantAccount", MerchantAccountSchema);
