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
const fs = require("fs");
const path = require("path");

const Brand = require("../../models/core/brand.model");
const throwError = require("../../utils/throwError");
const asyncHandler = require("../../utils/asyncHandler");

const { ObjectId } = mongoose.Types;

/* ===============================
   Upload Directory
=============================== */

const uploadDir = path.join(__dirname, "../../uploads/brands");

/* ===============================
   Constants
=============================== */

const LANGUAGES = ["EN", "AR", "FR", "ES", "DE", "IT", "ZH", "JA", "RU"];

const CURRENCIES = [
  "USD", "SAR", "AED", "EGP", "EUR", "GBP", "KWD", "QAR", "OMR",
  "BHD", "JPY", "CNY", "INR", "TRY", "RUB", "AUD", "CAD"
];

/* ===============================
   Joi Validation Schemas
=============================== */

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

  logo: Joi.string().max(300).allow(null),

  maxBranches: Joi.number().min(1).max(50),

  currency: Joi.string().valid(...CURRENCIES),

  companyRegister: Joi.string().max(100),

  taxIdNumber: Joi.string().max(100),

  timezone: Joi.string().max(100),

  countryCode: Joi.string().length(2),

  setupStatus: Joi.string().valid("draft", "basic", "branches", "ready"),

  createdBy: Joi.string().required().custom((value, helpers) => {
    if (!ObjectId.isValid(value)) return helpers.error("any.invalid");
    return value;
  }, "ObjectId Validation"),

}).options({ abortEarly: false, stripUnknown: true });


const updateBrandSchema = Joi.object({
  dashboardLanguages: Joi.array()
    .items(Joi.string().valid(...LANGUAGES))
    .unique(),

  defaultDashboardLanguage: Joi.string()
    .valid(...LANGUAGES),

  name: Joi.object()
    .pattern(Joi.string(), Joi.string().min(2).max(100).trim()),

  logo: Joi.string().max(300).allow(null),

  maxBranches: Joi.number().min(1).max(50),

  currency: Joi.string().valid(...CURRENCIES),

  companyRegister: Joi.string().max(100),

  taxIdNumber: Joi.string().max(100),

  timezone: Joi.string().max(100),

  countryCode: Joi.string().length(2),

  setupStatus: Joi.string().valid("draft", "basic", "branches", "ready"),

  isActive: Joi.boolean(),

  updatedBy: Joi.string().required().custom((value, helpers) => {
    if (!ObjectId.isValid(value)) return helpers.error("any.invalid");
    return value;
  }, "ObjectId Validation"),

}).min(1).options({ abortEarly: false, stripUnknown: true });

/* ===============================
   Helper Functions
=============================== */

/**
 * Validate that brand names:
 * - Are only in allowed dashboard languages
 * - No duplicate values across languages
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
 */
const isDefaultLanguageValid = (defaultLang, dashboardLanguages) =>
  dashboardLanguages.includes(defaultLang);


/* ===============================
   CRUD Functions
=============================== */


/**
 * Create a new brand
 */
const createBrand = asyncHandler(async (req, res) => {

  const payload = {
    ...req.body,
    createdBy: req.user?._id
  };

  const { error, value } = createBrandSchema.validate(payload);

  if (error) throwError("Validation error", 400, error.details);

  if (!isDefaultLanguageValid(value.defaultDashboardLanguage, value.dashboardLanguages)) {
    throwError("Default dashboard language must be one of the dashboard languages");
  }

  // Single brand enforcement
  const existing = await Brand.findOne({ isDeleted: false });

  if (existing)
    throwError("Only one brand allowed", 409);


  // Validate names against dashboardLanguages
  const nameError = validateNameLanguages(value.name, value.dashboardLanguages);

  if (nameError)
    throwError(nameError);


  // Ensure unique names per language
  for (const lang of Object.keys(value.name)) {

    const conflict = await Brand.findOne({
      isDeleted: false,
      [`name.${lang}`]: value.name[lang]
    });

    if (conflict)
      throwError(`Brand name exists for language: ${lang}`, 409);

  }

  const brand = await Brand.create(value);

  res.status(201).json({
    success: true,
    message: "Brand created",
    data: brand
  });

});


/**
 * Get the single existing brand
 */
const getBrand = asyncHandler(async (req, res) => {

  const brand = await Brand.findOne({ isDeleted: false });

  if (!brand)
    throwError("Brand not found", 404);

  res.json({
    success: true,
    data: brand
  });

});


/**
 * Update the existing brand
 */
const updateBrand = asyncHandler(async (req, res) => {

  const brandId = req.brand._id;

  if (!ObjectId.isValid(brandId))
    throwError("Invalid brand id");


  const existBrand = await Brand.findOne({
    _id: brandId,
    isDeleted: false
  });

  if (!existBrand)
    throwError("Brand not found", 404);


  const { error, value } = updateBrandSchema.validate({
    ...req.body,
    updatedBy: req.user?._id
  });

  if (error)
    throwError("Validation error", 400, error.details);


  const dashboardLanguages =
    value.dashboardLanguages || existBrand.dashboardLanguages;

  const defaultDashboardLanguage =
    value.defaultDashboardLanguage || existBrand.defaultDashboardLanguage;


  if (!isDefaultLanguageValid(defaultDashboardLanguage, dashboardLanguages)) {
    throwError("Default dashboard language must be one of the dashboard languages");
  }


  if (value.name) {

    const nameError = validateNameLanguages(value.name, dashboardLanguages);

    if (nameError)
      throwError(nameError);


    for (const lang of Object.keys(value.name)) {

      const conflict = await Brand.findOne({
        _id: { $ne: existBrand._id },
        isDeleted: false,
        [`name.${lang}`]: value.name[lang],
      });

      if (conflict)
        throwError(`Brand name exists for language: ${lang}`, 409);

    }

  }


  // Merge defined fields only
  Object.keys(value).forEach((key) => {
    if (value[key] !== undefined)
      existBrand[key] = value[key];
  });


  await existBrand.save();

  res.json({
    success: true,
    message: "Brand updated",
    data: existBrand
  });

});


/**
 * Update Brand Logo
 */
const updateBrandLogo = asyncHandler(async (req, res) => {

  const brandId = req.brand._id;

  if (!ObjectId.isValid(brandId))
    throwError("Invalid brand id");


  const existBrand = await Brand.findOne({
    _id: brandId,
    isDeleted: false
  });

  if (!existBrand)
    throwError("Brand not found", 404);


  if (!req.file)
    throwError("No logo file uploaded", 400);


  const oldLogo = existBrand.logo;

  try {

    existBrand.logo = req.file.filename;

    await existBrand.save();

  } catch (err) {

    // delete uploaded file if DB failed
    const newFilePath = path.join(uploadDir, req.file.filename);

    if (fs.existsSync(newFilePath))
      fs.unlinkSync(newFilePath);

    throw err;

  }


  // delete old logo
  if (oldLogo) {

    const oldPath = path.join(uploadDir, oldLogo);

    if (fs.existsSync(oldPath))
      fs.unlinkSync(oldPath);

  }


  res.json({
    success: true,
    message: "Brand logo updated",
    data: existBrand
  });

});


/**
 * Soft delete the brand
 */
const deleteBrand = asyncHandler(async (req, res) => {

  const existBrand = await Brand.findOne({ isDeleted: false });

  if (!existBrand)
    throwError("Brand not found", 404);


  existBrand.isDeleted = true;
  existBrand.deletedAt = new Date();
  existBrand.deletedBy = req.user?._id;

  await existBrand.save();

  res.json({
    success: true,
    message: "Brand deleted"
  });

});


/* ===============================
   Export
=============================== */

module.exports = {
  createBrand,
  getBrand,
  updateBrand,
  updateBrandLogo,
  deleteBrand,
};