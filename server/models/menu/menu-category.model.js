import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema;

/**
 * MenuCategory Schema
 * -------------------
 * Represents a category in the menu (e.g., Breakfast, Lunch, Drinks)
 * Supports time-based visibility and multiple order channels.
 */
const menuCategorySchema = new mongoose.Schema(
  {
    brand: { type: ObjectId, ref: "Brand", required: true, index: true },
    branch: { type: ObjectId, ref: "Branch", default: null, index: true },

    // Category name and description (multilingual)
    name: [
      {
        lang: {
          type: String,
          enum: ["EN", "AR"],
        },
        value: {
          type: String,
          trim: true,
          minlength: 2,
          maxlength: 100,
        },
      },
    ],

    description: [
      {
        lang: {
          type: String,
          enum: ["EN", "AR"],
        },
        value: {
          type: String,
          trim: true,
          minlength: 2,
          maxlength: 100,
        },
      },
    ],

    // Display order and visibility for customers
    displayOrder: { type: Number, required: true, min: 0, index: true },
    isVisible: { type: Boolean, default: true, index: true },

    // Supported order channels
    availableChannels: {
      type: [String],
      enum: ["dineIn", "takeaway", "delivery"],
      default: ["dineIn", "takeaway", "delivery"],
    },

    // Time window during which this category is visible (e.g., Breakfast)
    availableFrom: {
      type: String,
      match: /^([01]\d|2[0-3]):([0-5]\d)$/,
      default: null,
    },
    availableTo: {
      type: String,
      match: /^([01]\d|2[0-3]):([0-5]\d)$/,
      default: null,
    },

    // Hierarchy and grouping
    isGroupCategory: { type: Boolean, default: false },
    parentCategory: { type: ObjectId, ref: "MenuCategory", default: null },
    isMainCategory: { type: Boolean, default: false },

    // Status and lifecycle
    status: {
      type: String,
      enum: ["active", "inactive", "archived"],
      default: "active",
      index: true,
    },

    // Audit fields
    createdBy: { type: ObjectId, ref: "UserAccount", required: true },
    updatedBy: { type: ObjectId, ref: "UserAccount", default: null },

    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: ObjectId, ref: "UserAccount", default: null },
  },
  { timestamps: true, versionKey: false },
);

// Indexes for faster queries
menuCategorySchema.index({ brand: 1, branch: 1, displayOrder: 1 });
menuCategorySchema.index({ brand: 1, branch: 1, "name.en": 1 });

// Soft delete method
menuCategorySchema.methods.softDelete = function (employeeId) {
  this.isDeleted = true;
  this.status = "archived";
  this.deletedAt = new Date();
  this.updatedBy = employeeId;
  return this.save();
};
const MenuCategoryModel= mongoose.model("MenuCategory", menuCategorySchema);

export default MenuCategoryModel;
