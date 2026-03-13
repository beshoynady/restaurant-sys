/**
 * Branch Controller
 * -----------------
 * Handles Branch CRUD operations with:
 * - Joi validation
 * - Language validation against brand dashboardLanguages
 * - Unique name and address per language
 * - Single main branch enforcement
 * - Soft delete / restore
 */

import mongoose from "mongoose";
import Joi from "joi";

import Branch from "../../models/core/branch.model.js";
import Brand from "../../models/core/brand.model.js";

import throwError from "../../utils/throwError.js";
import asyncHandler from "../../utils/asyncHandler.js";

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

  address: Joi.object()
    .pattern(Joi.string(), addressSchema)
    .required(),

  postalCode: Joi.string().max(20),

  latitude: Joi.number().min(-90).max(90),

  longitude: Joi.number().min(-180).max(180),

  isMainBranch: Joi.boolean(),

  status: Joi.string().valid("active", "inactive", "under_maintenance"),

  taxIdentificationNumber: Joi.string().max(50),

}).options({ abortEarly: false, stripUnknown: true });


const updateBranchSchema = Joi.object({

  name: Joi.object()
    .pattern(Joi.string(), Joi.string().min(2).max(100)),

  address: Joi.object()
    .pattern(Joi.string(), addressSchema),

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

// Ensure only one main branch
const ensureSingleMainBranch = async (brandId, excludeId = null) => {

  const query = {
    brand: brandId,
    isMainBranch: true,
    isDeleted: false,
  };

  if (excludeId) query._id = { $ne: excludeId };

  const exists = await Branch.findOne(query);

  return !!exists;

};


// Unique branch name per language
const ensureUniqueBranchName = async (brandId, name, excludeId = null) => {

  for (const lang of Object.keys(name)) {

    const conflict = await Branch.findOne({
      brand: brandId,
      isDeleted: false,
      _id: { $ne: excludeId },
      [`name.${lang}`]: name[lang],
    });

    if (conflict) return lang;

  }

  return null;

};


// Unique branch address
const ensureUniqueBranchAddress = async (brandId, address, excludeId = null) => {

  for (const lang of Object.keys(address)) {

    const addr = address[lang];

    const conflict = await Branch.findOne({
      brand: brandId,
      isDeleted: false,
      _id: { $ne: excludeId },
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


// Validate languages against brand
const validateLanguagesAgainstBrand = (obj, brandLanguages) => {

  const langs = Object.keys(obj);

  for (const lang of langs) {

    if (!brandLanguages.includes(lang.toUpperCase())) {
      return `Language "${lang}" is not allowed`;
    }

  }

  return null;

};


/* ======================================================
   CRUD Functions
====================================================== */


/**
 * Create Branch
 */
const createBranch = asyncHandler(async (req, res) => {

  const brandId = req.brand._id;
  const employeeId = req.user._id;

  const { error, value } = createBranchSchema.validate(req.body);

  if (error) throwError("Validation error", 400, error.details);

  const brand = await Brand.findById(brandId);

  if (!brand)
    throwError("Brand not found", 404);


  const nameError = validateLanguagesAgainstBrand(
    value.name,
    brand.dashboardLanguages
  );

  if (nameError)
    throwError(nameError);


  const addrError = validateLanguagesAgainstBrand(
    value.address,
    brand.dashboardLanguages
  );

  if (addrError)
    throwError(addrError);


  if (value.isMainBranch) {

    const hasMain = await ensureSingleMainBranch(brandId);

    if (hasMain)
      throwError("Main branch already exists", 409);

  }


  const duplicateLang = await ensureUniqueBranchName(
    brandId,
    value.name
  );

  if (duplicateLang)
    throwError(`Branch name exists for language: ${duplicateLang}`, 409);


  const duplicateAddrLang = await ensureUniqueBranchAddress(
    brandId,
    value.address
  );

  if (duplicateAddrLang)
    throwError(`Branch address exists for language: ${duplicateAddrLang}`, 409);


  const branch = await Branch.create({
    brand: brandId,
    ...value,
    createdBy: employeeId,
  });


  res.status(201).json({
    success: true,
    message: "Branch created",
    data: branch,
  });

});


/**
 * Update Branch
 */
const updateBranch = asyncHandler(async (req, res) => {

  const brandId = req.brand._id;
  const branchId = req.params.id;

  if (!ObjectId.isValid(branchId))
    throwError("Invalid branch id");


  const { error, value } = updateBranchSchema.validate(req.body);

  if (error)
    throwError("Validation error", 400, error.details);


  const branch = await Branch.findOne({
    _id: branchId,
    brand: brandId,
    isDeleted: false,
  });

  if (!branch)
    throwError("Branch not found", 404);


  const brand = await Brand.findById(brandId);


  if (value.name) {

    const nameError = validateLanguagesAgainstBrand(
      value.name,
      brand.dashboardLanguages
    );

    if (nameError)
      throwError(nameError);


    const duplicateLang = await ensureUniqueBranchName(
      brandId,
      value.name,
      branchId
    );

    if (duplicateLang)
      throwError(`Branch name exists for language: ${duplicateLang}`, 409);

  }


  if (value.address) {

    const addrError = validateLanguagesAgainstBrand(
      value.address,
      brand.dashboardLanguages
    );

    if (addrError)
      throwError(addrError);


    const duplicateAddrLang = await ensureUniqueBranchAddress(
      brandId,
      value.address,
      branchId
    );

    if (duplicateAddrLang)
      throwError(`Branch address exists for language: ${duplicateAddrLang}`, 409);

  }


  if (value.isMainBranch) {

    const hasMain = await ensureSingleMainBranch(
      brandId,
      branchId
    );

    if (hasMain)
      throwError("Another main branch already exists", 409);

  }


  Object.assign(branch, value, {
    updatedBy: req.user._id,
  });

  await branch.save();


  res.json({
    success: true,
    message: "Branch updated",
    data: branch,
  });

});


/**
 * Get all branches
 */
const getBranches = asyncHandler(async (req, res) => {

  const brandId = req.brand._id;

  const branches = await Branch.find({
    brand: brandId,
    isDeleted: false,
  }).sort({ createdAt: -1 });

  res.json({
    success: true,
    data: branches,
  });

});


/**
 * Get active branches
 */
const getActiveBranches = asyncHandler(async (req, res) => {

  const brandId = req.brand._id;

  const branches = await Branch.find({
    brand: brandId,
    status: "active",
    isDeleted: false,
  });

  res.json({
    success: true,
    data: branches,
  });

});


/**
 * Get branch by id
 */
const getBranchById = asyncHandler(async (req, res) => {

  const brandId = req.brand._id;
  const { id } = req.params;

  if (!ObjectId.isValid(id))
    throwError("Invalid branch id");


  const branch = await Branch.findOne({
    _id: id,
    brand: brandId,
    isDeleted: false,
  });

  if (!branch)
    throwError("Branch not found", 404);


  res.json({
    success: true,
    data: branch,
  });

});


/**
 * Soft delete
 */
const softDeleteBranch = asyncHandler(async (req, res) => {

  const brandId = req.brand._id;
  const { id } = req.params;

  const branch = await Branch.findOneAndUpdate(
    {
      _id: id,
      brand: brandId,
      isDeleted: false,
    },
    {
      isDeleted: true,
      status: "inactive",
      deletedAt: new Date(),
      deletedBy: req.user._id,
    },
    { new: true }
  );

  if (!branch)
    throwError("Branch not found", 404);


  res.json({
    success: true,
    message: "Branch soft deleted",
  });

});


/**
 * Restore branch
 */
const restoreBranch = asyncHandler(async (req, res) => {

  const brandId = req.brand._id;
  const { id } = req.params;

  const branch = await Branch.findOneAndUpdate(
    {
      _id: id,
      brand: brandId,
      isDeleted: true,
    },
    {
      isDeleted: false,
      status: "active",
      deletedAt: null,
      deletedBy: null,
    },
    { new: true }
  );

  if (!branch)
    throwError("Branch not found or not deleted", 404);


  res.json({
    success: true,
    message: "Branch restored",
    data: branch,
  });

});


/**
 * Hard delete
 */
const hardDeleteBranch = asyncHandler(async (req, res) => {

  const brandId = req.brand._id;
  const { id } = req.params;

  const branch = await Branch.findOneAndDelete({
    _id: id,
    brand: brandId,
  });

  if (!branch)
    throwError("Branch not found", 404);


  res.json({
    success: true,
    message: "Branch permanently deleted",
  });

});


/* ======================================================
   export 
====================================================== */

export  {
  createBranch,
  updateBranch,
  getBranches,
  getActiveBranches,
  getBranchById,
  softDeleteBranch,
  restoreBranch,
  hardDeleteBranch,
};