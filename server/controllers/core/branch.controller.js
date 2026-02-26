const mongoose = require("mongoose");
const Joi = require("joi");
const Branch = require("../../models/core/branch.model");
const Brand = require("../../models/core/brand.model");
const { ObjectId } = mongoose.Types;

/* ======================================================
   Joi Validation Schemas
====================================================== */

const addressSchema = Joi.object({
  country: Joi.string().max(100).required(),
  stateOrProvince: Joi.string().max(100),
  city: Joi.string().max(100).required(),
  area: Joi.string().max(100),
  street: Joi.string().max(150),
  buildingNumber: Joi.string().max(20),
  floor: Joi.string().max(10),
  landmark: Joi.string().max(150),
});

const createBranchSchema = Joi.object({
  name: Joi.object()
    .pattern(Joi.string(), Joi.string().min(2).max(100))
    .required(),
  address: Joi.object().pattern(Joi.string(), addressSchema).required(),
  postalCode: Joi.string().max(20),
  latitude: Joi.number().min(-90).max(90),
  longitude: Joi.number().min(-180).max(180),
  isMainBranch: Joi.boolean(),
  status: Joi.string().valid("active", "inactive", "under_maintenance"),
  taxIdentificationNumber: Joi.string().max(50),
}).options({ abortEarly: false, stripUnknown: true });

const updateBranchSchema = Joi.object({
  name: Joi.object().pattern(Joi.string(), Joi.string().min(2).max(100)),
  address: Joi.object().pattern(Joi.string(), addressSchema),
  postalCode: Joi.string().max(20),
  latitude: Joi.number().min(-90).max(90),
  longitude: Joi.number().min(-180).max(180),
  isMainBranch: Joi.boolean(),
  status: Joi.string().valid("active", "inactive", "under_maintenance"),
  taxIdentificationNumber: Joi.string().max(50),
})
  .min(1)
  .options({ abortEarly: false, stripUnknown: true });

/* ======================================================
   Helper Functions
====================================================== */

// Ensure only one main branch exists
const ensureSingleMainBranch = async (brandId, excludeId = null) => {
  const query = { brand: brandId, isMainBranch: true, isDeleted: false };
  if (excludeId) query._id = { $ne: excludeId };
  const exists = await Branch.findOne(query);
  return !!exists;
};

// Check unique branch name per language
const ensureUniqueBranchName = async (brandId, name, excludeId = null) => {
  for (const lang of Object.keys(name)) {
    const conflict = await Branch.findOne({
      _id: { $ne: excludeId },
      brand: brandId,
      isDeleted: false,
      [`name.${lang}`]: name[lang],
    });
    if (conflict) return lang;
  }
  return null;
};

// Check unique branch address per language
const ensureUniqueBranchAddress = async (
  brandId,
  address,
  excludeId = null,
) => {
  for (const lang of Object.keys(address)) {
    const addr = address[lang];
    const conflict = await Branch.findOne({
      _id: { $ne: excludeId },
      brand: brandId,
      isDeleted: false,
      [`address.${lang}.country`]: addr.country,
      [`address.${lang}.city`]: addr.city,
      [`address.${lang}.street`]: addr.street,
      [`address.${lang}.buildingNumber`]: addr.buildingNumber,
      [`address.${lang}.floor`]: addr.floor,
      [`address.${lang}.area`]: addr.area,
      [`address.${lang}.landmark`]: addr.landmark,
    });
    if (conflict) return lang;
  }
  return null;
};

// Validate branch name or address languages against brand dashboardLanguages
const validateLanguagesAgainstBrand = (branchObj, brandLanguages) => {
  const langs = Object.keys(branchObj);
  for (const lang of langs) {
    if (!brandLanguages.includes(lang.toUpperCase())) {
      return `Language "${lang}" is not allowed (not in brand dashboardLanguages)`;
    }
  }
  // Check for duplicate values
  const values = Object.values(branchObj);
  const duplicates = values.filter((v, i, arr) => arr.indexOf(v) !== i);
  if (duplicates.length > 0) {
    return `Duplicate values found for languages: ${duplicates.join(", ")}`;
  }
  return null;
};

/* ======================================================
   CRUD Functions
====================================================== */

/**
 * Create new branch
 */
const createBranch = async (req, res) => {
  try {
    const brandId = req.brand._id;
    const employeeId = req.employee.id;
    const {
      name,
      address,
      postalCode,
      latitude,
      longitude,
      isMainBranch,
      status,
      taxIdentificationNumber,
    } = req.body;

    // Validate input via Joi
    const { error, value } = createBranchSchema.validate({
      name,
      address,
      postalCode,
      latitude,
      longitude,
      isMainBranch,
      status,
      taxIdentificationNumber,
    });
    if (error)
      return res
        .status(400)
        .json({
          success: false,
          message: "Validation error",
          errors: error.details,
        });

    // Fetch brand dashboardLanguages
    const brand = await Brand.findById(brandId);
    if (!brand)
      return res
        .status(404)
        .json({ success: false, message: "Brand not found" });

    // Validate languages
    const nameError = validateLanguagesAgainstBrand(
      value.name,
      brand.dashboardLanguages,
    );
    if (nameError)
      return res.status(400).json({ success: false, message: nameError });

    const addrError = validateLanguagesAgainstBrand(
      value.address,
      brand.dashboardLanguages,
    );
    if (addrError)
      return res.status(400).json({ success: false, message: addrError });

    // Single main branch check
    if (value.isMainBranch) {
      const hasMain = await ensureSingleMainBranch(brandId);
      if (hasMain)
        return res
          .status(409)
          .json({
            success: false,
            message: "Main branch already exists for this brand",
          });
    }

    // Unique branch name check
    const duplicateLang = await ensureUniqueBranchName(brandId, value.name);
    if (duplicateLang)
      return res
        .status(409)
        .json({
          success: false,
          message: `Branch name already exists for language: ${duplicateLang}`,
        });

    // Unique branch address check
    const duplicateAddrLang = await ensureUniqueBranchAddress(
      brandId,
      value.address,
    );
    if (duplicateAddrLang)
      return res
        .status(409)
        .json({
          success: false,
          message: `Branch address already exists for language: ${duplicateAddrLang}`,
        });

    // Create branch
    const branch = await Branch.create({
      brand: brandId,
      ...value,
      createdBy: employeeId,
    });

    return res
      .status(201)
      .json({
        success: true,
        message: "Branch created successfully",
        data: branch,
      });
  } catch (err) {
    return res
      .status(500)
      .json({
        success: false,
        message: "Failed to create branch",
        error: err.message,
      });
  }
};

/**
 * Update existing branch
 */
const updateBranch = async (req, res) => {
  try {
    const brandId = req.brand._id;
    const branchId = req.params.id;
    const updatedBy = req.employee._id;

    if (!ObjectId.isValid(branchId))
      return res
        .status(400)
        .json({ success: false, message: "Invalid branch id" });

    const { error, value } = updateBranchSchema.validate(req.body);
    if (error)
      return res
        .status(400)
        .json({
          success: false,
          message: "Validation error",
          errors: error.details,
        });

    const branch = await Branch.findOne({
      _id: branchId,
      brand: brandId,
      isDeleted: false,
    });
    if (!branch)
      return res
        .status(404)
        .json({ success: false, message: "Branch not found" });

    // Fetch brand dashboardLanguages
    const brand = await Brand.findById(brandId);

    // Validate name languages
    if (value.name) {
      const nameError = validateLanguagesAgainstBrand(
        value.name,
        brand.dashboardLanguages,
      );
      if (nameError)
        return res.status(400).json({ success: false, message: nameError });

      const duplicateLang = await ensureUniqueBranchName(
        brandId,
        value.name,
        branchId,
      );
      if (duplicateLang)
        return res
          .status(409)
          .json({
            success: false,
            message: `Branch name already exists for language: ${duplicateLang}`,
          });
    }

    // Validate address languages
    if (value.address) {
      const addrError = validateLanguagesAgainstBrand(
        value.address,
        brand.dashboardLanguages,
      );
      if (addrError)
        return res.status(400).json({ success: false, message: addrError });

      const duplicateAddrLang = await ensureUniqueBranchAddress(
        brandId,
        value.address,
        branchId,
      );
      if (duplicateAddrLang)
        return res
          .status(409)
          .json({
            success: false,
            message: `Branch address already exists for language: ${duplicateAddrLang}`,
          });
    }

    // Ensure single main branch
    if (value.isMainBranch) {
      const hasMain = await ensureSingleMainBranch(brandId, branchId);
      if (hasMain)
        return res
          .status(409)
          .json({
            success: false,
            message: "Another main branch already exists",
          });
    }

    Object.assign(branch, value, { updatedBy });
    await branch.save();

    return res.json({
      success: true,
      message: "Branch updated successfully",
      data: branch,
    });
  } catch (err) {
    return res
      .status(500)
      .json({
        success: false,
        message: "Failed to update branch",
        error: err.message,
      });
  }
};

/**
 * Get all branches for a brand
 */
const getBranches = async (req, res) => {
  try {
    const brandId = req.brand._id;
    const branches = await Branch.find({
      brand: brandId,
      isDeleted: false,
    }).sort({ createdAt: -1 });
    return res.json({ success: true, data: branches });
  } catch (err) {
    return res
      .status(500)
      .json({
        success: false,
        message: "Failed to fetch branches",
        error: err.message,
      });
  }
};

/**
 * Get active branches only
 */
const getActiveBranches = async (req, res) => {
  try {
    const brandId = req.brand._id;
    const branches = await Branch.find({
      brand: brandId,
      isDeleted: false,
      status: "active",
    }).sort({ createdAt: -1 });
    return res.json({ success: true, data: branches });
  } catch (err) {
    return res
      .status(500)
      .json({
        success: false,
        message: "Failed to fetch active branches",
        error: err.message,
      });
  }
};

/**
 * Get branch by ID
 */
const getBranchById = async (req, res) => {
  try {
    const brandId = req.brand._id;
    const { id } = req.params;
    if (!ObjectId.isValid(id))
      return res
        .status(400)
        .json({ success: false, message: "Invalid branch id" });

    const branch = await Branch.findOne({
      _id: id,
      brand: brandId,
      isDeleted: false,
    });
    if (!branch)
      return res
        .status(404)
        .json({ success: false, message: "Branch not found" });

    return res.json({ success: true, data: branch });
  } catch (err) {
    return res
      .status(500)
      .json({
        success: false,
        message: "Failed to fetch branch",
        error: err.message,
      });
  }
};

/**
 * Soft delete branch
 */
const softDeleteBranch = async (req, res) => {
  try {
    const brandId = req.brand._id;
    const { id } = req.params;
    if (!ObjectId.isValid(id))
      return res
        .status(400)
        .json({ success: false, message: "Invalid branch id" });

    const branch = await Branch.findOneAndUpdate(
      { _id: id, brand: brandId, isDeleted: false },
      {
        isDeleted: true,
        status: "inactive",
        deletedAt: new Date(),
        deletedBy: req.employee.id,
      },
      { new: true },
    );

    if (!branch)
      return res
        .status(404)
        .json({ success: false, message: "Branch not found" });

    return res.json({
      success: true,
      message: "Branch soft-deleted successfully",
    });
  } catch (err) {
    return res
      .status(500)
      .json({
        success: false,
        message: "Failed to soft-delete branch",
        error: err.message,
      });
  }
};

/**
 * Restore soft-deleted branch
 */
const restoreBranch = async (req, res) => {
  try {
    const brandId = req.brand._id;
    const { id } = req.params;
    if (!ObjectId.isValid(id))
      return res
        .status(400)
        .json({ success: false, message: "Invalid branch id" });

    const branch = await Branch.findOneAndUpdate(
      { _id: id, brand: brandId, isDeleted: true },
      { isDeleted: false, status: "active", deletedAt: null, deletedBy: null },
      { new: true },
    );

    if (!branch)
      return res
        .status(404)
        .json({ success: false, message: "Branch not found or not deleted" });

    return res.json({
      success: true,
      message: "Branch restored successfully",
      data: branch,
    });
  } catch (err) {
    return res
      .status(500)
      .json({
        success: false,
        message: "Failed to restore branch",
        error: err.message,
      });
  }
};

/**
 * Hard delete branch permanently
 */
const hardDeleteBranch = async (req, res) => {
  try {
    const brandId = req.brand._id;
    const { id } = req.params;
    if (!ObjectId.isValid(id))
      return res
        .status(400)
        .json({ success: false, message: "Invalid branch id" });

    const branch = await Branch.findOneAndDelete({ _id: id, brand: brandId });
    if (!branch)
      return res
        .status(404)
        .json({ success: false, message: "Branch not found" });

    return res.json({ success: true, message: "Branch permanently deleted" });
  } catch (err) {
    return res
      .status(500)
      .json({
        success: false,
        message: "Failed to permanently delete branch",
        error: err.message,
      });
  }
};

/* ======================================================
   Export all CRUD functions
====================================================== */
module.exports = {
  createBranch,
  updateBranch,
  getBranches,
  getActiveBranches,
  getBranchById,
  softDeleteBranch,
  restoreBranch,
  hardDeleteBranch,
};
