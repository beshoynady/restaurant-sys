const mongoose = require("mongoose");
const MenuCategory = require("../../models/menu/menu-category.model");
const Product = require("../../models/menu/product.model");
const Joi = require("joi");

// ==========================
// JOI validation schemas
// ==========================
const createMenuCategorySchema = Joi.object({
  brand: Joi.string().required(),
  branch: Joi.string().allow(null, ""),
  name: Joi.object()
  .pattern(
    Joi.string(),
    Joi.string().min(2).max(50).required()
  )
  .min(1)
  .required(),
  description: Joi.object()
  .pattern(
    Joi.string(),
    Joi.string().max(200)
  )
  .default({}),
  displayOrder: Joi.number().min(1),
  isVisible: Joi.boolean().default(true),
  availableChannels: Joi.array()
    .items(Joi.string().valid("dineIn", "takeaway", "delivery"))
    .default(["dineIn", "takeaway", "delivery"]),
  availableFrom: Joi.string()
    .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .allow(null),
  availableTo: Joi.string()
    .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .allow(null),
  isGroupCategory: Joi.boolean().default(false),
  parentCategory: Joi.string().allow(null),
  isMainCategory: Joi.boolean().default(false),
  status: Joi.string()
    .valid("active", "inactive", "archived")
    .default("active"),
});

const updateMenuCategorySchema = Joi.object({
  name: Joi.object()
  .pattern(
    Joi.string(),
    Joi.string().min(2).max(50).required()
  )
  .min(1)
  .required(),
  description: Joi.object()
  .pattern(
    Joi.string(),
    Joi.string().max(200)
  ),
  displayOrder: Joi.number().min(0),
  isVisible: Joi.boolean(),
  availableChannels: Joi.array().items(
    Joi.string().valid("dineIn", "takeaway", "delivery")
  ),
  availableFrom: Joi.string()
    .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .allow(null),
  availableTo: Joi.string()
    .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .allow(null),
  isGroupCategory: Joi.boolean(),
  parentCategory: Joi.string().allow(null),
  isMainCategory: Joi.boolean(),
  status: Joi.string().valid("active", "inactive", "archived"),
});

// ==========================
// Create Menu Category
// ==========================
const createMenuCategory = async (req, res, next) => {
  try {
    const { error } = createMenuCategorySchema.validate(req.body);
    if (error)
      return res
        .status(400)
        .json({ success: false, message: error.details[0].message });

    const {
      brand,
      branch,
      name,
      description,
      displayOrder,
      isVisible,
      availableChannels,
      availableFrom,
      availableTo,
      isGroupCategory,
      parentCategory,
      isMainCategory,
      status,
    } = req.body;

    // Check for duplicate names across all languages
    for (const [lang, value] of Object.entries(name)) {
      const exists = await MenuCategory.findOne({
        brand,
        branch: branch || null,
        [`name.${lang}`]: value,
        isDeleted: false,
      });
      if (exists)
        return res.status(409).json({
          success: false,
          message: `Category name already exists for language: ${lang}`,
        });
    }

    // Determine order
    let order = displayOrder;
    if (order === undefined || order === null) {
      const lastCategory = await MenuCategory.findOne({
        brand,
        branch: branch || null,
      }).sort({ displayOrder: -1 });
      order = lastCategory ? lastCategory.displayOrder + 1 : 1;
    }

    const createdBy = req.user.id;
    const category = await MenuCategory.create({
      brand,
      branch: branch || null,
      name,
      description,
      displayOrder: order,
      isVisible,
      availableChannels,
      availableFrom,
      availableTo,
      isGroupCategory,
      parentCategory: parentCategory || null,
      isMainCategory,
      status,
      createdBy,
    });

    res.status(201).json({ success: true, data: category });
  } catch (err) {
    console.error("Create MenuCategory Error:", err);
    res
      .status(500)
      .json({
        success: false,
        message: "Failed to create menu category",
        error: err.message,
      });
    next(err);
  }
};



// ==========================
// Get All Menu Categories with filters/search/sort
// ==========================
const getAllMenuCategories = async (req, res, next) => {
  try {
    const {
      brand,
      branch,
      status,
      search,
      sortField = "displayOrder",
      sortOrder = "asc",
    } = req.query;
    const filter = { isDeleted: false };
    if (brand) filter.brand = brand;
    if (branch) filter.branch = branch;
    if (status) filter.status = status;

    // Search by name in any language dynamically
    if (search) {
      filter.$or = [];
      const categories = await MenuCategory.find({ isDeleted: false })
        .select("name")
        .lean();
      categories.forEach((cat) => {
        for (const [lang, value] of cat.name) {
          if (value && value.toLowerCase().includes(search.toLowerCase())) {
            filter.$or.push({
              [`name.${lang}`]: { $regex: search, $options: "i" },
            });
          }
        }
      });
    }

    const categories = await MenuCategory.find(filter)
      .sort({ [sortField]: sortOrder === "asc" ? 1 : -1 })
      .populate("createdBy", "name")
      .populate("updatedBy", "name");

    res
      .status(200)
      .json({ success: true, results: categories.length, data: categories });
  } catch (err) {
    console.error("GetAll MenuCategory Error:", err);
    res
      .status(500)
      .json({
        success: false,
        message: "Failed to fetch menu categories",
        error: err.message,
      });
    next(err);
  }
};

// ==========================
// Get One Menu Category by ID
// ==========================
const getOneMenuCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res
        .status(400)
        .json({ success: false, message: "Invalid category ID" });

    const category = await MenuCategory.findById(id).populate(
      "createdBy updatedBy",
      "name"
    );
    if (!category)
      return res
        .status(404)
        .json({ success: false, message: "Menu category not found" });

    res.status(200).json({ success: true, data: category });
  } catch (err) {
    console.error("GetOne MenuCategory Error:", err);
    res
      .status(500)
      .json({
        success: false,
        message: "Failed to fetch menu category",
        error: err.message,
      });
    next(err);
  }
};

// ==========================
// Update Menu Category
// ==========================
const updateMenuCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res
        .status(400)
        .json({ success: false, message: "Invalid category ID" });

    const { error } = updateMenuCategorySchema.validate(req.body);
    if (error)
      return res
        .status(400)
        .json({ success: false, message: error.details[0].message });

    const category = await MenuCategory.findById(id);
    if (!category)
      return res
        .status(404)
        .json({ success: false, message: "Menu category not found" });

    // Prevent duplicate names across all languages
    if (req.body.name) {
      for (const [lang, value] of Object.entries(req.body.name)) {
        const exists = await MenuCategory.findOne({
          _id: { $ne: id },
          brand: category.brand,
          branch: category.branch,
          [`name.${lang}`]: value,
          isDeleted: false,
        });
        if (exists)
          return res
            .status(409)
            .json({
              success: false,
              message: `Category name already exists for language: ${lang}`,
            });
      }
    }

    Object.assign(category, req.body, { updatedBy: req.user.id });
    await category.save();

    res.status(200).json({ success: true, data: category });
  } catch (err) {
    console.error("Update MenuCategory Error:", err);
    res
      .status(500)
      .json({
        success: false,
        message: "Failed to update menu category",
        error: err.message,
      });
    next(err);
  }
};

// ==========================
// Reorder Menu Categories
// ==========================
const reorderMenuCategories = async (req, res, next) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds) || !orderedIds.length)
      return res
        .status(400)
        .json({ success: false, message: "Invalid orderedIds array" });

    for (let i = 0; i < orderedIds.length; i++) {
      const id = orderedIds[i];
      if (!mongoose.Types.ObjectId.isValid(id)) continue;
      await MenuCategory.findByIdAndUpdate(id, { displayOrder: i + 1 });
    }

    res
      .status(200)
      .json({
        success: true,
        message: "Menu categories reordered successfully",
      });
  } catch (err) {
    console.error("Reorder MenuCategory Error:", err);
    res
      .status(500)
      .json({
        success: false,
        message: "Failed to reorder menu categories",
        error: err.message,
      });
    next(err);
  }
};

// ==========================
// Delete Menu Category (Soft delete) with Product check
// ==========================
const deleteMenuCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res
        .status(400)
        .json({ success: false, message: "Invalid category ID" });

    const linkedProduct = await Product.findOne({ category: id });
    if (linkedProduct)
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Cannot delete category. There are products linked to this category.",
        });

    const category = await MenuCategory.findById(id);
    if (!category)
      return res
        .status(404)
        .json({ success: false, message: "Menu category not found" });

    category.isDeleted = true;
    category.status = "archived";
    category.deletedAt = new Date();
    category.deletedBy = req.user.id;
    await category.save();

    res
      .status(200)
      .json({
        success: true,
        message: "Category deleted successfully",
        data: category,
      });
  } catch (err) {
    console.error("Delete MenuCategory Error:", err);
    res
      .status(500)
      .json({
        success: false,
        message: "Failed to delete menu category",
        error: err.message,
      });
    next(err);
  }
};

// ==========================
// Export controllers
// ==========================
module.exports = {
  createMenuCategory,
  getAllMenuCategories,
  getOneMenuCategory,
  updateMenuCategory,
  reorderMenuCategories,
  deleteMenuCategory,
};
