import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema.Types;

const extraDetailsSchema = new mongoose.Schema(
  {
    product: { type: ObjectId, ref: "Product", required: true },
    quantity: { type: Number, default: 1 },
    minQuantity: { type: Number, default: 0 },
    maxQuantity: { type: Number, default: 0 },
  },
  { _id: false },
);

/**
 * Product Schema
 * Represents a menu item, addon, combo, or size group in the restaurant system.
 */
const ProductSchema = new mongoose.Schema(
  {
    /* =========================
       BRAND & BRANCH
    ========================= */
    brand: { type: ObjectId, ref: "Brand", required: true }, // Brand reference
    branch: { type: ObjectId, ref: "Branch", default: null }, // Optional branch reference

    /* =========================
       DISPLAY
    ========================= */
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
    // Product description in multiple languages, stored as a Map with language codes as keys
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
    // if you want to support multiple images per product, you can change this to an array of strings
    image: {
      type: String,
      maxlength: 255,
      default: null,
    }, // Product image URL or filename

    /* =========================
       IDENTIFIERS
    ========================= */
    sku: { type: String, sparse: true }, // Stock Keeping Unit (optional) — uniqueness enforced by the {brand,sku} compound index below (DB-002)
    barcode: { type: String, sparse: true }, // Barcode (optional) — uniqueness enforced by the {brand,barcode} compound index below (DB-002)

    /* =========================
       CATEGORY & PREPARATION
    ========================= */
    category: { type: ObjectId, ref: "MenuCategory", required: true }, // Product category
    // Enterprise Menu & Sales Platform Final Review: fixed a confirmed dangling reference — the
    // model actually registered for this collection is "PreparationSectionConfig" (see
    // preparation-section.model.js), not "PreparationSection", which resolves to no model at all
    // and silently breaks `.populate()`. This is the same bug class already found and fixed on
    // ProductionRecord/ProductionOrder/PreparationTicket this engagement — found here for the
    // first time on Product itself, which product.service.js's own `defaultPopulate` calls on
    // every read.
    preparationSection: {
      type: ObjectId,
      ref: "PreparationSectionConfig",
      required: true, // Section or kitchen responsible for this product
    },

    /* =========================
       PRODUCT TYPE
    ========================= */
    productType: {
      type: String,
      enum: ["normal", "addon"], // normal: regular sale product, addon: extra/additional item
      default: "normal",
    },

    /* =========================
       SIZE SYSTEM
    ========================= */
    parentProduct: { type: ObjectId, ref: "Product", default: null }, // Reference to main product if this is a size
    isSizeGroup: { type: Boolean, default: false }, // Whether this is a size group container
    sizeLabel: {
      type: Map,
      of: {
        type: String,
        trim: true,
        minlength: 2,
        maxlength: 100,
      },
    },

    sizeOrder: { type: Number, default: 0 }, // Display order of sizes
    sizes: [{ type: ObjectId, ref: "Product" }], // List of size products if this is a size group

    /* =========================
        EXTRAS
    ========================= */
    hasExtras: { type: Boolean, default: false }, // Whether this product can have extras
    extras: [extraDetailsSchema],
    /* =========================
       COMBO SYSTEM
    ========================= */
    isCombo: { type: Boolean, default: false }, // Whether this product is a combo
    comboGroups: [
      {
        required: Boolean,
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
        minSelection: {
          type: Number,
          default: 0,
        },
        maxSelection: {
          type: Number,
        },
        items: [
          {
            product: { type: ObjectId, ref: "Product" }, // normal
            quantity: { type: Number, default: 1 }, // Default stock quantity
          },
        ],
      },
    ],

    /* =========================
       PRICING
    ========================= */
    price: { type: Number, required: true, min: 0 }, // Base price
    discount: { type: Number, default: 0, min: 0 }, // Discount amount
    priceAfterDiscount: { type: Number, default: 0, min: 0 }, // Price after discount
    discountFrom: { type: Date }, // Discount start date
    discountTo: { type: Date }, // Discount end date
    isTaxable: { type: Boolean, default: true }, // Whether product is subject to tax
    taxRate: {
      type: ObjectId,
      ref: "TaxConfig", // Reference to tax settings
      default: null,
    }, // Applicable tax rate percentage

    /* =========================
       STATUS & SELLING
    ========================= */
    status: {
      type: String,
      enum: ["active", "inactive", "out_of_stock"],
      default: "active",
    },
    isSellable: { type: Boolean, default: true }, // If false, product cannot be sold
    displayOrder: { type: Number, default: 0 }, // Order of display in menu

    /* =========================
       AUDIT & SOFT DELETE
    ========================= */
    createdBy: { type: ObjectId, ref: "UserAccount", required: true },
    updatedBy: { type: ObjectId, ref: "UserAccount" },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    deletedBy: { type: ObjectId, ref: "UserAccount" },
  },
  { timestamps: true }, // Automatically creates createdAt and updatedAt
);

// DB-002: brand-scoped catalog identifiers (replaces the previous global-unique `sku`)
// V6.0-class fix, applied proactively: `sparse: true` only excludes documents missing the
// indexed field entirely from the whole compound index — it does NOT mean "exclude documents
// where sku/barcode is null" — so two sku-less/barcode-less products in the same brand still
// collided on `sku: null`/`barcode: null`. Same defect class already found and fixed on
// Supplier/Department/JobTitle/StockItem/PaymentMethod this engagement; fixed here the same way.
ProductSchema.index(
  { brand: 1, sku: 1 },
  { unique: true, partialFilterExpression: { sku: { $exists: true, $type: "string" } } },
);
ProductSchema.index(
  { brand: 1, barcode: 1 },
  { unique: true, partialFilterExpression: { barcode: { $exists: true, $type: "string" } } },
);

const ProductModel = mongoose.model("Product", ProductSchema);
export default ProductModel;
