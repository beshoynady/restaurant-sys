/**
 * Brand Controller
 * ----------------
 * Handles Brand CRUD operations with:
 * - Joi validation
 * - Explicit field extraction
 * - Audit fields (createdBy/updatedBy)
 * - Soft delete
 * - Single Brand enforcement
 * - Unique name per language
 * - Dashboard language enforcement
 */

const mongoose = require("mongoose");
const Joi = require("joi");
const Brand = require("../../models/core/brand.model");

const { ObjectId } = mongoose.Types;

/* ===============================
   Joi Validation Schemas
=============================== */

// Validation schema for creating a brand
const createBrandSchema = Joi.object({
  dashboardLanguages: Joi.array()
    .items(
      Joi.string().valid("EN", "AR", "FR", "ES", "DE", "IT", "ZH", "JA", "RU"),
    )
    .unique()
    .required(),
  defaultDashboardLanguage: Joi.string()
    .valid("EN", "AR", "FR", "ES", "DE", "IT", "ZH", "JA", "RU")
    .required(),
  name: Joi.object()
    .pattern(Joi.string(), Joi.string().min(2).max(100).trim())
    .required(),
  logo: Joi.string().max(300).allow(null),
  maxBranches: Joi.number().min(1).max(50),
  currency: Joi.string().valid(
    "USD",
    "SAR",
    "AED",
    "EGP",
    "EUR",
    "GBP",
    "KWD",
    "QAR",
    "OMR",
    "BHD",
    "JPY",
    "CNY",
    "INR",
    "TRY",
    "RUB",
    "AUD",
    "CAD",
  ),
  companyRegister: Joi.string().max(100),
  taxIdNumber: Joi.string().max(100),
  timezone: Joi.string().max(100),
  countryCode: Joi.string().length(2),
  setupStatus: Joi.string().valid("draft", "basic", "branches", "ready"),
  createdBy: Joi.string()
    .required()
    .custom((value, helpers) => {
      if (!ObjectId.isValid(value)) return helpers.error("any.invalid");
      return value;
    }, "ObjectId Validation"),
}).options({ abortEarly: false, stripUnknown: true });

// Validation schema for updating a brand
const updateBrandSchema = Joi.object({
  dashboardLanguages: Joi.array()
    .items(
      Joi.string().valid("EN", "AR", "FR", "ES", "DE", "IT", "ZH", "JA", "RU"),
    )
    .unique(),
  defaultDashboardLanguage: Joi.string().valid(
    "EN",
    "AR",
    "FR",
    "ES",
    "DE",
    "IT",
    "ZH",
    "JA",
    "RU",
  ),
  name: Joi.object().pattern(Joi.string(), Joi.string().min(2).max(100).trim()),
  logo: Joi.string().max(300).allow(null),
  maxBranches: Joi.number().min(1).max(50),
  currency: Joi.string().valid(
    "USD",
    "SAR",
    "AED",
    "EGP",
    "EUR",
    "GBP",
    "KWD",
    "QAR",
    "OMR",
    "BHD",
    "JPY",
    "CNY",
    "INR",
    "TRY",
    "RUB",
    "AUD",
    "CAD",
  ),
  companyRegister: Joi.string().max(100),
  taxIdNumber: Joi.string().max(100),
  timezone: Joi.string().max(100),
  countryCode: Joi.string().length(2),
  setupStatus: Joi.string().valid("draft", "basic", "branches", "ready"),
  isActive: Joi.boolean(),
  updatedBy: Joi.string()
    .required()
    .custom((value, helpers) => {
      if (!ObjectId.isValid(value)) return helpers.error("any.invalid");
      return value;
    }, "ObjectId Validation"),
})
  .min(1)
  .options({ abortEarly: false, stripUnknown: true });

/* ===============================
   Helper Functions
=============================== */

/**
 * Validate that brand names:
 * 1. Are only in allowed dashboard languages
 * 2. No duplicate values across languages
 * @param {Object} nameObj - The brand name object with languages as keys
 * @param {Array} dashboardLanguages - Allowed languages
 * @returns {string|null} Error message or null if valid
 */
const validateNameLanguages = (nameObj, dashboardLanguages) => {
  const langs = Object.keys(nameObj);
  for (const lang of langs) {
    if (!dashboardLanguages.includes(lang.toUpperCase())) {
      return `Language ${lang} is not allowed for this brand`;
    }
  }
  const values = Object.values(nameObj);
  const duplicates = values.filter((v, i, arr) => arr.indexOf(v) !== i);
  if (duplicates.length > 0) {
    return `Duplicate names found for languages: ${duplicates.join(", ")}`;
  }
  return null;
};

/**
 * Ensure default dashboard language is included in dashboardLanguages
 * @param {string} defaultLang
 * @param {Array} dashboardLanguages
 * @returns {boolean}
 */
const isDefaultLanguageValid = (defaultLang, dashboardLanguages) =>
  dashboardLanguages.includes(defaultLang);

/* ===============================
   CRUD Functions
=============================== */

/**
 * Create a new brand
 * 1. Validate input using Joi
 * 2. Ensure default language is in dashboardLanguages
 * 3. Ensure only one brand exists
 * 4. Validate names for allowed languages and uniqueness
 * 5. Save brand with audit field
 */
const createBrand = async (req, res) => {
  try {
    const payload = { ...req.body, createdBy: req.employee?._id };
    const { error, value } = createBrandSchema.validate(payload);
    if (error)
      return res
        .status(400)
        .json({
          success: false,
          message: "Validation error",
          errors: error.details,
        });

    // Check default language
    if (
      !isDefaultLanguageValid(
        value.defaultDashboardLanguage,
        value.dashboardLanguages,
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Default dashboard language must be one of the dashboard languages",
      });
    }

    // Only one brand allowed
    const existing = await Brand.findOne({ isDeleted: false });
    if (existing)
      return res
        .status(409)
        .json({ success: false, message: "Only one brand allowed" });

    // Validate names against dashboardLanguages
    const nameError = validateNameLanguages(
      value.name,
      value.dashboardLanguages,
    );
    if (nameError)
      return res.status(400).json({ success: false, message: nameError });

    // Unique name per language across all brands
    for (const lang of Object.keys(value.name)) {
      const conflict = await Brand.findOne({
        isDeleted: false,
        [`name.${lang}`]: value.name[lang],
      });
      if (conflict)
        return res
          .status(409)
          .json({
            success: false,
            message: `Brand name exists for language: ${lang}`,
          });
    }

    const brand = await Brand.create(value);
    return res
      .status(201)
      .json({ success: true, message: "Brand created", data: brand });
  } catch (err) {
    return res
      .status(500)
      .json({
        success: false,
        message: "Failed to create brand",
        error: err.message,
      });
  }
};

/**
 * Get the single existing brand
 */
const getBrand = async (req, res) => {
  try {
    const brand = await Brand.findOne({ isDeleted: false });
    if (!brand)
      return res
        .status(404)
        .json({ success: false, message: "Brand not found" });
    return res.json({ success: true, data: brand });
  } catch (err) {
    return res
      .status(500)
      .json({
        success: false,
        message: "Failed to fetch brand",
        error: err.message,
      });
  }
};

/**
 * Update the existing brand
 * 1. Validate input using Joi
 * 2. Merge only defined fields safely
 * 3. Check default language validity
 * 4. Validate names against current dashboardLanguages
 * 5. Ensure unique names per language
 */
const updateBrand = async (req, res) => {
  try {
    const brandId = req.brand._id;
    const updatedBy = req.employee?._id;
    if (!ObjectId.isValid(brandId))
      return res
        .status(400)
        .json({ success: false, message: "Invalid brand id" });

    const existBrand = await Brand.findOne({ _id: brandId, isDeleted: false });
    if (!existBrand)
      return res
        .status(404)
        .json({ success: false, message: "Brand not found" });

    const { error, value } = updateBrandSchema.validate({ ...req.body, updatedBy });
    if (error)
      return res
        .status(400)
        .json({
          success: false,
          message: "Validation error",
          errors: error.details,
        });

    const currentDashboardLanguages =
      value.dashboardLanguages || existBrand.dashboardLanguages;
    const defaultDashboardLanguage =
      value.defaultDashboardLanguage || existBrand.defaultDashboardLanguage;

    // Check default language
    if (
      !isDefaultLanguageValid(
        defaultDashboardLanguage,
        currentDashboardLanguages,
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Default dashboard language must be one of the dashboard languages",
      });
    }

    // Validate names
    if (value.name) {
      const nameError = validateNameLanguages(
        value.name,
        currentDashboardLanguages,
      );
      if (nameError)
        return res.status(400).json({ success: false, message: nameError });

      // Unique name per language
      for (const lang of Object.keys(value.name)) {
        const conflict = await Brand.findOne({
          _id: { $ne: existBrand._id },
          isDeleted: false,
          [`name.${lang}`]: value.name[lang],
        });
        if (conflict)
          return res
            .status(409)
            .json({
              success: false,
              message: `Brand name exists for language: ${lang}`,
            });
      }
    }

    // Merge safely only defined fields
    for (const key of Object.keys(value)) {
      if (value[key] !== undefined) existBrand[key] = value[key];
    }

    await existBrand.save();
    return res.json({
      success: true,
      message: "Brand updated",
      data: existBrand,
    });
  } catch (err) {
    return res
      .status(500)
      .json({
        success: false,
        message: "Failed to update brand",
        error: err.message,
      });
  }
};

/**
 * Soft delete the brand
 */
const deleteBrand = async (req, res) => {
  try {
    const existBrand = await Brand.findOne({ isDeleted: false });
    if (!existBrand)
      return res
        .status(404)
        .json({ success: false, message: "Brand not found" });

    existBrand.isDeleted = true;
    existBrand.deletedAt = new Date();
    existBrand.deletedBy = req.employee?._id;

    await existBrand.save();
    return res.json({ success: true, message: "Brand deleted" });
  } catch (err) {
    return res
      .status(500)
      .json({
        success: false,
        message: "Failed to delete brand",
        error: err.message,
      });
  }
};

/* ===============================
   Export
=============================== */
module.exports = {
  createBrand,
  getBrand,
  updateBrand,
  deleteBrand,
};
