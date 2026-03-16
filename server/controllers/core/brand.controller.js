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

import mongoose from "mongoose";
import Joi from "joi";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import Brand from "../../models/core/brand.model.js";
import throwError from "../../utils/throwError.js";
import asyncHandler from "../../utils/asyncHandler.js";

const { ObjectId } = mongoose.Types;

/* ===============================
   ESM Path Helpers
=============================== */

/**
 * Re-create __filename and __dirname for ES module scope.
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ===============================
   Upload Directory
=============================== */

/**
 * Absolute path for brand logo uploads directory.
 */
const uploadDir = path.join(__dirname, "../../uploads/brands");

/* ===============================
   Constants
=============================== */

/**
 * Allowed dashboard languages.
 */
const LANGUAGES = ["EN", "AR", "FR", "ES", "DE", "IT", "ZH", "JA", "RU"];

/**
 * Allowed brand currencies.
 */
const CURRENCIES = [
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
];

/* ===============================
   Joi Validation Schemas
=============================== */

/**
 * Validation schema for creating a brand.
 */
const createBrandSchema = Joi.object({
  dashboardLanguages: Joi.array()
    .items(Joi.string().valid(...LANGUAGES))
    .unique()
    .required(),

  defaultDashboardLanguage: Joi.string()
    .valid(...LANGUAGES)
    .required(),

  name: Joi.object()
    .pattern(Joi.string(), Joi.string().min(2).max(100).trim())
    .required(),

  logo: Joi.string().max(300).allow(null, ""),

  maxBranches: Joi.number().min(1).max(50),

  currency: Joi.string().valid(...CURRENCIES),

  companyRegister: Joi.string().max(100).allow("", null),

  taxIdNumber: Joi.string().max(100).allow("", null),

  timezone: Joi.string().max(100).allow("", null),

  countryCode: Joi.string().length(2).allow("", null),

  setupStatus: Joi.string().valid("draft", "basic", "branches", "ready"),

  createdBy: Joi.string()
    .required()
    .custom((value, helpers) => {
      if (!ObjectId.isValid(value)) return helpers.error("any.invalid");
      return value;
    }, "ObjectId Validation"),
}).options({ abortEarly: false, stripUnknown: true });

/**
 * Validation schema for updating a brand.
 */
const updateBrandSchema = Joi.object({
  dashboardLanguages: Joi.array()
    .items(Joi.string().valid(...LANGUAGES))
    .unique(),

  defaultDashboardLanguage: Joi.string()
    .valid(...LANGUAGES),

  name: Joi.object()
    .pattern(Joi.string(), Joi.string().min(2).max(100).trim()),

  logo: Joi.string().max(300).allow(null, ""),

  maxBranches: Joi.number().min(1).max(50),

  currency: Joi.string().valid(...CURRENCIES),

  companyRegister: Joi.string().max(100).allow("", null),

  taxIdNumber: Joi.string().max(100).allow("", null),

  timezone: Joi.string().max(100).allow("", null),

  countryCode: Joi.string().length(2).allow("", null),

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
 * - Use only allowed dashboard languages
 * - Do not contain duplicate values across languages
 *
 * @param {Object} nameObj
 * @param {string[]} dashboardLanguages
 * @returns {string|null}
 */
const validateNameLanguages = (nameObj, dashboardLanguages) => {
  if (!nameObj || typeof nameObj !== "object") {
    return "Brand name object is required";
  }

  const normalizedDashboardLanguages = dashboardLanguages.map((lang) =>
    String(lang).toUpperCase()
  );

  const langs = Object.keys(nameObj);

  for (const lang of langs) {
    if (!normalizedDashboardLanguages.includes(String(lang).toUpperCase())) {
      return `Language ${lang} is not allowed for this brand`;
    }
  }

  const normalizedValues = Object.values(nameObj)
    .map((value) => String(value).trim().toLowerCase())
    .filter(Boolean);

  const duplicates = normalizedValues.filter(
    (value, index, arr) => arr.indexOf(value) !== index
  );

  if (duplicates.length > 0) {
    return "Duplicate brand names are not allowed across languages";
  }

  return null;
};

/**
 * Ensure default dashboard language is included in dashboardLanguages.
 *
 * @param {string} defaultLang
 * @param {string[]} dashboardLanguages
 * @returns {boolean}
 */
const isDefaultLanguageValid = (defaultLang, dashboardLanguages) => {
  return dashboardLanguages.includes(defaultLang);
};

/**
 * Safely delete a file if it exists.
 *
 * @param {string} filePath
 */
const removeFileIfExists = (filePath) => {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

/* ===============================
   CRUD Functions
=============================== */

/**
 * Create a new brand.
 */
const createBrand = asyncHandler(async (req, res) => {
  const payload = {
    ...req.body,
    createdBy: req.user?._id?.toString(),
  };

  const { error, value } = createBrandSchema.validate(payload);

  if (error) {
    throwError("Validation error", 400, error.details);
  }

  if (
    !isDefaultLanguageValid(
      value.defaultDashboardLanguage,
      value.dashboardLanguages
    )
  ) {
    throwError(
      "Default dashboard language must be one of the dashboard languages",
      400
    );
  }

  // Enforce single active brand.
  const existing = await Brand.findOne({ isDeleted: false });

  if (existing) {
    throwError("Only one brand allowed", 409);
  }

  // Validate brand name languages.
  const nameError = validateNameLanguages(value.name, value.dashboardLanguages);

  if (nameError) {
    throwError(nameError, 400);
  }

  // Ensure unique names per language.
  for (const lang of Object.keys(value.name)) {
    const conflict = await Brand.findOne({
      isDeleted: false,
      [`name.${lang}`]: value.name[lang],
    });

    if (conflict) {
      throwError(`Brand name exists for language: ${lang}`, 409);
    }
  }

  const brand = await Brand.create(value);

  res.status(201).json({
    success: true,
    message: "Brand created",
    data: brand,
  });
});

/**
 * Get the single existing active brand.
 */
const getBrand = asyncHandler(async (req, res) => {
  const brand = await Brand.findOne({ isDeleted: false });

  if (!brand) {
    throwError("Brand not found", 404);
  }

  res.json({
    success: true,
    data: brand,
  });
});

/**
 * Update the existing active brand.
 */
const updateBrand = asyncHandler(async (req, res) => {
  const brandId = req.brand?._id;

  if (!brandId || !ObjectId.isValid(brandId)) {
    throwError("Invalid brand id", 400);
  }

  const existBrand = await Brand.findOne({
    _id: brandId,
    isDeleted: false,
  });

  if (!existBrand) {
    throwError("Brand not found", 404);
  }

  const payload = {
    ...req.body,
    updatedBy: req.user?._id?.toString(),
  };

  const { error, value } = updateBrandSchema.validate(payload);

  if (error) {
    throwError("Validation error", 400, error.details);
  }

  const dashboardLanguages =
    value.dashboardLanguages || existBrand.dashboardLanguages;

  const defaultDashboardLanguage =
    value.defaultDashboardLanguage || existBrand.defaultDashboardLanguage;

  if (
    !isDefaultLanguageValid(defaultDashboardLanguage, dashboardLanguages)
  ) {
    throwError(
      "Default dashboard language must be one of the dashboard languages",
      400
    );
  }

  if (value.name) {
    const nameError = validateNameLanguages(value.name, dashboardLanguages);

    if (nameError) {
      throwError(nameError, 400);
    }

    for (const lang of Object.keys(value.name)) {
      const conflict = await Brand.findOne({
        _id: { $ne: existBrand._id },
        isDeleted: false,
        [`name.${lang}`]: value.name[lang],
      });

      if (conflict) {
        throwError(`Brand name exists for language: ${lang}`, 409);
      }
    }
  }

  /**
   * Merge only defined fields into the existing document.
   */
  Object.keys(value).forEach((key) => {
    if (value[key] !== undefined) {
      existBrand[key] = value[key];
    }
  });

  await existBrand.save();

  res.json({
    success: true,
    message: "Brand updated",
    data: existBrand,
  });
});

/**
 * Update brand logo.
 */
const updateBrandLogo = asyncHandler(async (req, res) => {
  const brandId = req.brand?._id;

  if (!brandId || !ObjectId.isValid(brandId)) {
    throwError("Invalid brand id", 400);
  }

  const existBrand = await Brand.findOne({
    _id: brandId,
    isDeleted: false,
  });

  if (!existBrand) {
    throwError("Brand not found", 404);
  }

  if (!req.file) {
    throwError("No logo file uploaded", 400);
  }

  const oldLogo = existBrand.logo;

  try {
    existBrand.logo = req.file.filename;
    existBrand.updatedBy = req.user?._id || existBrand.updatedBy;

    await existBrand.save();
  } catch (err) {
    // Delete uploaded file if database save fails.
    const newFilePath = path.join(uploadDir, req.file.filename);
    removeFileIfExists(newFilePath);
    throw err;
  }

  // Delete old logo file after successful update.
  if (oldLogo) {
    const oldPath = path.join(uploadDir, oldLogo);
    removeFileIfExists(oldPath);
  }

  res.json({
    success: true,
    message: "Brand logo updated",
    data: existBrand,
  });
});

/**
 * Soft delete the active brand.
 */
const deleteBrand = asyncHandler(async (req, res) => {
  const existBrand = await Brand.findOne({ isDeleted: false });

  if (!existBrand) {
    throwError("Brand not found", 404);
  }

  existBrand.isDeleted = true;
  existBrand.deletedAt = new Date();
  existBrand.deletedBy = req.user?._id;

  await existBrand.save();

  res.json({
    success: true,
    message: "Brand deleted",
  });
});

/* ===============================
   Exports
=============================== */

export {
  createBrand,
  getBrand,
  updateBrand,
  updateBrandLogo,
  deleteBrand,
};