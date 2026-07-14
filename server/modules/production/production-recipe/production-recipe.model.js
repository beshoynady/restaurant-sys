import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema;

/**
 * ProductionRecipe — Enterprise Production Platform (StockItem -> StockItem BOM, "Tier 2" per
 * PRODUCTION_MANUFACTURING_DOMAIN_REDESIGN.md §1.1). Distinct from `menu/Recipe` (Product ->
 * StockItem, "Tier 1", à la minute preparation) — this is batch manufacturing: raw materials
 * (or other ProductionRecipe-backed semi-finished StockItems, nested to any depth) consumed to
 * produce a StockItem, tracked via `ProductionOrder`/`ProductionRecord`.
 */
const productionRecipeSchema = new mongoose.Schema(
  {
    brand: { type: ObjectId, ref: "Brand", required: true, index: true },
    branch: { type: ObjectId, ref: "Branch", default: null },

    stockItem: { type: ObjectId, ref: "StockItem", required: true, index: true }, // the OUTPUT item

    version: { type: Number, default: 1 },

    batchSize: { type: Number, required: true, min: 0.0001, default: 1 },
    unit: { type: String, trim: true, maxLength: 50, required: true },
    // Expected usable yield after trim/loss, distinct from the raw batchSize — e.g. a batch makes
    // 5kg of dough, expected usable yield after trim is 4.8kg. Defaults to batchSize (no expected
    // loss) when not explicitly set.
    expectedYield: { type: Number, min: 0.0001, default: null },

    preparationTime: { type: Number, default: 0, min: 0 },

    ingredients: [
      {
        itemId: { type: ObjectId, ref: "StockItem", required: true },
        quantity: { type: Number, required: true, min: 0.0001 },
        unit: { type: String, trim: true, maxLength: 50, required: true },
        wastePercentage: { type: Number, default: 0, min: 0, max: 100 },
      },
    ],

    preparationSteps: [
      {
        description: {
          type: Map,
          of: { type: String, trim: true, minlength: 2, maxlength: 100 },
          required: true,
        },
      },
    ],

    // Enterprise Production Platform Phase 3 — configurable production output destination, never
    // hardcoded. "PreparationInventory"/"KitchenInventory"/"ReservedInventory"/"DirectPOS" all
    // resolve to the executing ProductionOrder's own consumption warehouse (produce-in-place) —
    // this platform has no separate reservation/POS-availability balance mechanism (confirmed
    // absent, named in every prior Supply Chain audit this engagement produced), so those values
    // are honest routing labels, not five structurally distinct destinations. "Warehouse",
    // "CentralKitchen", "SpecificDepartment", "SpecificStation", "AnotherBranch" resolve to an
    // explicit target below.
    outputDestination: {
      type: String,
      enum: [
        "Warehouse", "PreparationInventory", "KitchenInventory", "CentralKitchen",
        "SpecificDepartment", "SpecificStation", "ReservedInventory", "SpecificBranch",
        "AnotherBranch", "DirectPOS",
      ],
      default: "Warehouse",
    },
    // Required when outputDestination is Warehouse/CentralKitchen/AnotherBranch — the explicit
    // target warehouse. Nullable otherwise (produce-in-place destinations resolve at execution
    // time from the ProductionOrder's own consumption warehouse).
    destinationWarehouse: { type: ObjectId, ref: "Warehouse", default: null },
    // Required when outputDestination is SpecificDepartment/SpecificStation — resolved to that
    // department's own `PreparationSectionConfig.warehouse` at execution time.
    destinationDepartment: { type: ObjectId, ref: "PreparationSectionConfig", default: null },

    // Recipe Cost Snapshot (Tier 2 cache, same discipline as Product.costFields in the Menu
    // redesign) — never the SSOT; always recalculable from Inventory.avgUnitCost via the
    // ingredient list. Refreshed by `previewCost()`/on save, not a background job in this pass.
    costFields: {
      estimatedUnitCost: { type: Number, default: null },
      costCalculatedAt: { type: Date, default: null },
    },

    isActive: { type: Boolean, default: true, index: true },

    createdBy: { type: ObjectId, ref: "UserAccount", required: true },
    updatedBy: { type: ObjectId, ref: "UserAccount", default: null },
  },
  { timestamps: true, versionKey: false },
);

// One active recipe per stock item — version supersession (deactivating the previous active
// version) is handled atomically in the service layer, not a Mongoose middleware hook (moved out
// of a pre('save') hook per PRODUCTION_MANUFACTURING_IMPLEMENTATION_PLAN.md §3.1 — a hook that
// only sets `version` without also deactivating the prior active row would violate this very
// index the moment a second version is created; the service now handles both atomically together).
productionRecipeSchema.index(
  { brand: 1, stockItem: 1 },
  { unique: true, partialFilterExpression: { isActive: true } },
);

export default mongoose.model("ProductionRecipe", productionRecipeSchema);
