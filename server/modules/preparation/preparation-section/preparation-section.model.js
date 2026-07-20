import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema;

const PreparationSectionConfigSchema = new mongoose.Schema(
  {
    /** Brand & Branch scope */
    brand: { type: ObjectId, ref: "Brand", required: true },
    branch: { type: ObjectId, ref: "Branch", default: null },

    /** Section details */
    name: {
      type: Map,
      of: {
        type: String,
        trim: true,
        minlength: 2,
        maxlength: 100,
      },
      required: true,
    },

    code: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 20,
    },

    description: {
      type: Map,
      of: {
        type: String,
        trim: true,
        minlength: 2,
        maxlength: 100,
      },
      required: true,
    },

    /**
     * Preparation & Kitchen Operations Platform: station-type classification, additive, not a
     * replacement for the free-text name/code above — a brand still names its own departments
     * however it wants ("Night Grill Station"); stationType is only the structural tag reports and
     * routing rules can rely on instead of parsing free text.
     */
    stationType: {
      type: String,
      enum: [
        "mainKitchen",
        "hotKitchen",
        "coldKitchen",
        "grill",
        "pizza",
        "bakery",
        "pastry",
        "dessert",
        "coffeeBar",
        "juiceBar",
        "cocktailBar",
        "seafood",
        "salad",
        "fryer",
        "packaging",
        "productionKitchen",
        "centralKitchen",
        "cloudKitchen",
        "other",
      ],
      default: "other",
    },

    /**
     * Preparation departments may nest (Department -> Area/Station), e.g. "Hot Line" (department)
     * containing "Grill" and "Fryer" (stations) — a self-reference, not a second model, matching
     * this platform's consistent "don't build a new model for a hierarchy a self-ref already
     * expresses" discipline (same reasoning already applied to Product's size-group self-ref).
     */
    parentDepartment: { type: ObjectId, ref: "PreparationSectionConfig", default: null },

    /**
     * Operational Inventory: the Warehouse this department consumes from / produces into. A
     * central kitchen, a branch kitchen, a bar — each is a real Warehouse (type: "kitchen"/"bar"/
     * "production") with its own independent Inventory balance via the existing, unchanged
     * Inventory Posting Engine; this field is the only new wiring needed, not a new balance-
     * tracking mechanism. Nullable: a department that consumes directly from the main warehouse
     * (no separate operational inventory tier) simply leaves this unset.
     */
    warehouse: { type: ObjectId, ref: "Warehouse", default: null },

    /** Staffing & equipment (lightweight references, not a new HR/Assets sub-model) */
    assignedEmployees: [{ type: ObjectId, ref: "Employee" }],
    equipment: [{ type: String, trim: true, maxlength: 100 }], // free-text equipment tags — a full
    // Equipment/Asset-tracking integration is Assets-domain work, out of this platform's scope;
    // this is a lightweight operational label only, not a fabricated asset-management feature.

    /** Working hours — same shape as Product Availability's daily window, for consistency */
    workingHours: {
      isAlwaysOpen: { type: Boolean, default: true },
      timeWindows: [{ from: { type: String, trim: true }, to: { type: String, trim: true } }],
    },

    /**
     * Preparation logic — genuine per-station operational facts (capacity/timing), not brand-wide
     * policy. PREPARATION_DOMAIN_ARCHITECTURE_REVIEW.md "Seventh Objective"/"Ninth Objective":
     * these two are the only fields in this block that were ever actually read anywhere
     * (`averagePreparationTime` by `preparation-ticket.service.js#createTicketsFromOrder`,
     * `maxParallelTickets` by `_groupTicketsByStation`'s utilization calc) — kept here on purpose.
     */
    averagePreparationTime: { type: Number, default: 10, min: 0 }, // minutes
    maxParallelTickets: { type: Number, default: 5, min: 1 }, // Max tickets this section can handle simultaneously

    // Removed (2026-07-20, PREPARATION_DOMAIN_ARCHITECTURE_REVIEW.md "Ninth Objective"/
    // "Recommended Architecture" #6): allowPartialDelivery, isDeliveryRelevant, autoAssignChef,
    // requireConfirmationBeforeSend, allowRejectTickets — all five were confirmed dead (zero
    // readers anywhere in this codebase, verified by exhaustive grep) and duplicated, in intent,
    // the equally-dormant PreparationTicketSettings model. Brand-wide ticket policy now lives in
    // PreparationSettings.ticket (see preparation-settings.model.js) — a genuine per-section
    // override, if ever needed, belongs here as a new field when a real use case demands it, not
    // reintroduced speculatively.

    /** Audit & status */
    isActive: { type: Boolean, default: true },
    createdBy: { type: ObjectId, ref: "UserAccount", required: true },
    updatedBy: { type: ObjectId, ref: "UserAccount", default: null },
    isDeleted: { type: Boolean, default: false },
    deletedBy: { type: ObjectId, ref: "UserAccount", default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Prevent duplicates per brand/branch and code
PreparationSectionConfigSchema.index(
  { brand: 1, branch: 1, code: 1 },
  { unique: true, sparse: true },
);

export default mongoose.model("PreparationSectionConfig", PreparationSectionConfigSchema);
