const Joi = require("joi");
const mongoose = require("mongoose");
const MenuSetting = require("../../models/settings/menu-settings.model");

// ============================
// Joi Validation Schema
// ============================
const createSchema = Joi.object({
  brand: Joi.string().required(),
  branch: Joi.string().optional().allow(null),

  showOutOfStockItems: Joi.boolean().optional(),
  hidePriceForUnavailable: Joi.boolean().optional(),

  allowCustomNotes: Joi.boolean().optional(),
  allowAddonsWithoutItem: Joi.boolean().optional(),
  maxAddonsPerItem: Joi.number().min(1).optional(),
  showAddonsPrice: Joi.boolean().optional(),

  priceIncludesTax: Joi.boolean().optional(),

  isActive: Joi.boolean().optional(),
  createdBy: Joi.string().required(),
  updatedBy: Joi.string().optional().allow(null),
});

const updateSchema = createSchema.fork(
  ["brand", "createdBy"],
  (schema) => schema.optional()
);

// ============================
// Create Menu Setting
// ============================
const createMenuSetting = async (req, res) => {
  try {
    const {
      brand,
      branch,
      showOutOfStockItems,
      hidePriceForUnavailable,
      allowCustomNotes,
      allowAddonsWithoutItem,
      maxAddonsPerItem,
      showAddonsPrice,
      priceIncludesTax,
      isActive,
      createdBy,
      updatedBy,
    } = req.body;

    // Validate input
    const { error } = createSchema.validate(req.body);
    if (error)
      return res.status(400).json({ message: "Validation error", errors: error.details });

    // Check if settings already exist for this brand/branch
    const exists = await MenuSetting.findOne({ brand, branch: branch || null });
    if (exists)
      return res.status(409).json({ message: "Menu settings already exist for this brand/branch" });

    // Create settings
    const menuSetting = await MenuSetting.create({
      brand,
      branch: branch || null,
      showOutOfStockItems,
      hidePriceForUnavailable,
      allowCustomNotes,
      allowAddonsWithoutItem,
      maxAddonsPerItem,
      showAddonsPrice,
      priceIncludesTax,
      isActive,
      createdBy,
      updatedBy,
    });

    res.status(201).json(menuSetting);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ============================
// Get Menu Setting
// ============================
const getMenuSetting = async (req, res) => {
  try {
    const { brandId, branchId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(brandId))
      return res.status(400).json({ message: "Invalid brand id" });

    if (branchId && !mongoose.Types.ObjectId.isValid(branchId))
      return res.status(400).json({ message: "Invalid branch id" });

    const filter = { brand: brandId };
    if (branchId) filter.branch = branchId;

    const menuSetting = await MenuSetting.findOne(filter)
      .populate("createdBy updatedBy", "name email");

    if (!menuSetting)
      return res.status(404).json({ message: "Menu settings not found" });

    res.status(200).json(menuSetting);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ============================
// Update Menu Setting
// ============================
const updateMenuSetting = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: "Invalid settings id" });

    const {
      branch,
      showOutOfStockItems,
      hidePriceForUnavailable,
      allowCustomNotes,
      allowAddonsWithoutItem,
      maxAddonsPerItem,
      showAddonsPrice,
      priceIncludesTax,
      isActive,
      updatedBy,
    } = req.body;

    // Validate input
    const { error } = updateSchema.validate(req.body);
    if (error)
      return res.status(400).json({ message: "Validation error", errors: error.details });

    const updated = await MenuSetting.findByIdAndUpdate(
      id,
      {
        $set: {
          branch: branch || null,
          showOutOfStockItems,
          hidePriceForUnavailable,
          allowCustomNotes,
          allowAddonsWithoutItem,
          maxAddonsPerItem,
          showAddonsPrice,
          priceIncludesTax,
          isActive,
          updatedBy,
        },
      },
      { new: true }
    );

    if (!updated)
      return res.status(404).json({ message: "Menu settings not found" });

    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ============================
// Delete Menu Setting
// ============================
const deleteMenuSetting = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: "Invalid settings id" });

    const deleted = await MenuSetting.findByIdAndDelete(id);

    if (!deleted)
      return res.status(404).json({ message: "Menu settings not found" });

    res.status(200).json({ message: "Menu settings deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ============================
// Export Controller
// ============================
module.exports = {
  createMenuSetting,
  getMenuSetting,
  updateMenuSetting,
  deleteMenuSetting,
};
