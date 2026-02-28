const mongoose = require("mongoose");
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
    name: { type: Map, of: String, required: true, trim: true }, // Product name in multiple languages
    description: { type: Map, of: String, default: "" }, // Description in multiple languages
    image: {
      type: String,
      default: null,
    }, // Product image URL or filename

    /* =========================
       IDENTIFIERS
    ========================= */
    sku: { type: String, unique: true, sparse: true }, // Stock Keeping Unit (optional)
    barcode: { type: String, sparse: true }, // Barcode (optional)

    /* =========================
       CATEGORY & PREPARATION
    ========================= */
    category: { type: ObjectId, ref: "MenuCategory", required: true }, // Product category
    preparationSection: {
      type: ObjectId,
      ref: "PreparationSection",
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
    sizeLabel: { type: Map, of: String, default: null }, // Label like "Small", "Medium", "Large"
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
        name: { type: Map, of: String, required: true },
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
      ref: "TaxConfig", // Reference to tax setting
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
    createdBy: { type: ObjectId, ref: "Employee", required: true },
    updatedBy: { type: ObjectId, ref: "Employee" },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    deletedBy: { type: ObjectId, ref: "Employee" },
  },
  { timestamps: true }, // Automatically creates createdAt and updatedAt
);

const ProductModel = mongoose.model("Product", ProductSchema);
export default ProductModel;
