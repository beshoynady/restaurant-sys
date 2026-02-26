const PreparationSectionModel = require("../models/PreparationSectionModel");
const Joi = require("joi");
const mongoose = require("mongoose");

/**
 * Custom Joi validator for MongoDB ObjectId
 */
const ObjectId = Joi.string().custom((value, helpers) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return helpers.message("Invalid ObjectId format");
  }
  return value;
}, "ObjectId Validation");

/**
 * Joi schema for creating a preparation section with multilingual support
 */
const createPreparationSectionSchema = Joi.object({
  brand: ObjectId.required(),
  branch: ObjectId.allow(null),
  name: Joi.object().required(), // Map of languages
  code: Joi.string().trim().uppercase().max(20).allow(null, ""),
  description: Joi.object().allow(null), // Map of languages
  averagePreparationTime: Joi.number().min(0).max(1440).default(0),
  isDeliveryRelevant: Joi.boolean().default(true),
  isActive: Joi.boolean().default(true),
});

/**
 * Joi schema for updating a preparation section
 */
const updatePreparationSectionSchema = Joi.object({
  name: Joi.object(),
  code: Joi.string().trim().uppercase().max(20).allow(null, ""),
  description: Joi.object().allow(null),
  averagePreparationTime: Joi.number().min(0).max(1440),
  isDeliveryRelevant: Joi.boolean(),
  isActive: Joi.boolean(),
});

/**
 * Joi schema for query params
 */
const querySchema = Joi.object({
  brand: ObjectId,
  branch: ObjectId,
  active: Joi.boolean(),
});

/**
 * Create Preparation Section
 */
const createPreparationSection = async (req, res) => {
  try {
    const { error, value } = createPreparationSectionSchema.validate(req.body);
    if (error)
      return res
        .status(400)
        .json({ success: false, message: error.details[0].message });

    const {
      brand,
      branch,
      name,
      code,
      description,
      averagePreparationTime,
      isDeliveryRelevant,
      isActive,
    } = value;

    // Check for duplicate section name per brand/branch (use default language 'en')
    const language = Object.keys(name)[0]; // مثلاً "en"
    const valueToCheck = name[language];

    const exists = await PreparationSectionModel.findOne({
      brand,
      branch: branch || null,
      [`name.${language}`]: valueToCheck, // استخدام computed key
    });

    if (exists) {
      return res.status(409).json({
        success: false,
        message: `Preparation section name already exists for language '${language}'`,
      });
    }

    const section = await PreparationSectionModel.create({
      brand,
      branch: branch || null,
      name,
      code,
      description,
      averagePreparationTime,
      isDeliveryRelevant,
      isActive,
      createdBy: req.user._id,
    });

    return res.status(201).json({ success: true, data: section });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Update Preparation Section
 */
const updatePreparationSection = async (req, res) => {
  try {
    const preparationSectionId = req.params.id;
    const {
      brand,
      branch,
      name,
      code,
      description,
      averagePreparationTime,
      isDeliveryRelevant,
      isActive,
    } = req.body;

    // Validate input
    const { error } = updatePreparationSectionSchema.validate(req.body);
    if (error)
      return res
        .status(400)
        .json({ success: false, message: error.details[0].message });

    // Find section
    const section = await PreparationSectionModel.findById(
      preparationSectionId
    );
    if (!section)
      return res
        .status(404)
        .json({ success: false, message: "Preparation section not found" });

    // Check for duplicate name in the same language
    if (name) {
      const language = Object.keys(value.name)[0]; // get the language key
      const nameToCheck = value.name[language];

      if (nameToCheck !== section.name.get(language)) {
        const exists = await PreparationSectionModel.findOne({
          _id: { $ne: section._id },
          brand: brand || section.brand,
          branch: branch !== undefined ? branch : section.branch,
          [`name.${language}`]: nameToCheck,
        });

        if (exists) {
          return res.status(409).json({
            success: false,
            message: `Preparation section name already exists for language '${language}'`,
          });
        }
      }
    }

    // Update section
    Object.assign(section, {
      name,
      code,
      description,
      averagePreparationTime,
      isDeliveryRelevant,
      isActive,
      updatedBy: req.user._id,
    });
    await section.save();

    return res.status(200).json({ success: true, data: section });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Get All Preparation Sections
 */
const getAllPreparationSections = async (req, res) => {
  try {
    const { error, value } = querySchema.validate(req.query);
    if (error)
      return res
        .status(400)
        .json({ success: false, message: error.details[0].message });

    const filter = {};
    if (value.brand) filter.brand = value.brand;
    if (value.branch) filter.branch = value.branch;
    if (value.active !== undefined) filter.isActive = value.active;

    const sections = await PreparationSectionModel.find(filter)
      .sort({ "name.en": 1 })
      .populate("createdBy", "name")
      .populate("updatedBy", "name");

    return res
      .status(200)
      .json({ success: true, results: sections.length, data: sections });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Get Active Preparation Sections (POS/KDS)
 */
const getActivePreparationSections = async (req, res) => {
  try {
    const filter = { isActive: true };
    if (req.query.brand) filter.brand = req.query.brand;
    if (req.query.branch) filter.branch = req.query.branch;

    const sections = await PreparationSectionModel.find(filter).sort({
      "name.en": 1,
    });

    return res.status(200).json({ success: true, data: sections });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Get Preparation Section By ID
 */
const getPreparationSectionById = async (req, res) => {
  try {
    const section = await PreparationSectionModel.findById(req.params.id)
      .populate("createdBy", "name")
      .populate("updatedBy", "name");

    if (!section)
      return res
        .status(404)
        .json({ success: false, message: "Preparation section not found" });

    return res.status(200).json({ success: true, data: section });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Soft Delete (Deactivate Section)
 */
const deletePreparationSection = async (req, res) => {
  try {
    const section = await PreparationSectionModel.findById(req.params.id);
    if (!section)
      return res
        .status(404)
        .json({ success: false, message: "Preparation section not found" });

    section.isActive = false;
    section.updatedBy = req.user._id;
    await section.save();

    return res.status(200).json({
      success: true,
      message: "Preparation section deactivated successfully",
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Toggle Active Status
 */
const togglePreparationSectionStatus = async (req, res) => {
  try {
    const section = await PreparationSectionModel.findById(req.params.id);
    if (!section)
      return res
        .status(404)
        .json({ success: false, message: "Preparation section not found" });

    section.isActive = !section.isActive;
    section.updatedBy = req.user._id;
    await section.save();

    return res.status(200).json({ success: true, data: section });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  createPreparationSection,
  updatePreparationSection,
  getAllPreparationSections,
  getActivePreparationSections,
  getPreparationSectionById,
  deletePreparationSection,
  togglePreparationSectionStatus,
};
