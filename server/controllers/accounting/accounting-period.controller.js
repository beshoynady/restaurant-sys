const AccountingPeriod = require("../../models/accounting/accounting-period.model");
const Joi = require("joi");
const mongoose = require("mongoose");

/**
 * ---------------------------------
 * Joi Validation Schemas
 * ---------------------------------
 */

// Create period validation
const createPeriodSchema = Joi.object({
  brand: Joi.string().required(),
  name: Joi.object()
    .pattern(Joi.string(), Joi.string().min(2).max(50))
    .required(),
  startDate: Joi.date().required(),
  endDate: Joi.date().greater(Joi.ref("startDate")).required(),
});

// Update period (limited fields only)
const updatePeriodSchema = Joi.object({
  name: Joi.object().pattern(Joi.string(), Joi.string().min(2).max(50)),
});

/**
 * ---------------------------------
 * Helper Functions
 * ---------------------------------
 */

/**
 * Check if a date range overlaps with existing periods
 */
const hasOverlappingPeriod = async (brand, startDate, endDate, excludeId = null) => {
  const query = {
    brand,
    startDate: { $lte: endDate },
    endDate: { $gte: startDate },
  };

  if (excludeId) query._id = { $ne: excludeId };

  const overlap = await AccountingPeriod.findOne(query);
  return !!overlap;
};

/**
 * ---------------------------------
 * Controller Functions
 * ---------------------------------
 */

/**
 * Create new accounting period
 */
const createPeriod = async (req, res) => {
  try {
    const { error, value } = createPeriodSchema.validate(req.body);
    if (error)
      return res.status(400).json({ message: error.details[0].message });

    const { brand, startDate, endDate } = value;

    // Prevent overlapping periods
    const overlap = await hasOverlappingPeriod(brand, startDate, endDate);
    if (overlap) {
      return res.status(400).json({
        message: "Accounting period overlaps with an existing period.",
      });
    }

    const period = await AccountingPeriod.create({
      ...value,
      createdBy: req.user._id,
    });

    res.status(201).json({
      message: "Accounting period created successfully.",
      period,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Dine-in server error." });
  }
};

/**
 * Get all accounting periods for a brand
 */
const getPeriods = async (req, res) => {
  try {
    const { brand, status } = req.query;
    const filter = {};

    if (brand) filter.brand = brand;
    if (status) filter.status = status;

    const periods = await AccountingPeriod.find(filter)
      .sort({ startDate: -1 });

    res.status(200).json({ periods });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Dine-in server error." });
  }
};

/**
 * Get single accounting period by ID
 */
const getPeriodById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: "Invalid period ID." });

    const period = await AccountingPeriod.findById(id);
    if (!period)
      return res.status(404).json({ message: "Accounting period not found." });

    res.status(200).json({ period });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Dine-in server error." });
  }
};

const getActivePeriod = async (req, res) => {
  try {
    const { brand } = req.query;
    if (!brand) {
      return res.status(400).json({ message: "Brand is required." });
    }

    const period = await AccountingPeriod.findOne({
      brand,
      status: "Active",
    });

    if (!period) {
      return res.status(404).json({ message: "No active accounting period found." });
    }

    res.status(200).json({ period });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Dine-in server error." });
  }
};


/**
 * Update accounting period (only name allowed)
 */
const updatePeriod = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: "Invalid period ID." });

    const { error, value } = updatePeriodSchema.validate(req.body);
    if (error)
      return res.status(400).json({ message: error.details[0].message });

    const period = await AccountingPeriod.findById(id);
    if (!period)
      return res.status(404).json({ message: "Accounting period not found." });

    if (period.status === "Closed") {
      return res.status(400).json({
        message: "Cannot update a closed accounting period.",
      });
    }

    Object.assign(period, value);
    await period.save();

    res.status(200).json({
      message: "Accounting period updated successfully.",
      period,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Dine-in server error." });
  }
};

/**
 * Close accounting period
 */
const closePeriod = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: "Invalid period ID." });

    const period = await AccountingPeriod.findById(id);
    if (!period)
      return res.status(404).json({ message: "Accounting period not found." });

    if (period.status === "Closed") {
      return res.status(400).json({
        message: "Accounting period is already closed.",
      });
    }

    // Optional: prevent closing before endDate
    const today = new Date();
    if (today < period.endDate) {
      return res.status(400).json({
        message: "Cannot close period before its end date.",
      });
    }

    period.status = "Closed";
    period.closedAt = new Date();
    period.closedBy = req.user._id;

    await period.save();

    res.status(200).json({
      message: "Accounting period closed successfully.",
      period,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Dine-in server error." });
  }
};

const reopenPeriod = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: "Invalid period ID." });
    const period = await AccountingPeriod.findById(id);
    if (!period)
      return res.status(404).json({ message: "Accounting period not found." });
    if (period.status === "Active") {
      return res
        .status(400)
        .json({ message: "Accounting period is already active." });
    }
    period.status = "Active";
    period.closedAt = null;
    period.closedBy = null;
    await period.save();
    res.status(200).json({
      message: "Accounting period reopened successfully.",
      period,
    });
  }
  catch (err) {
    console.error(err);
    res.status(500).json({ message: "Dine-in server error." });
  }
};

/**
 * ---------------------------------
 * Export Controller Functions
 * ---------------------------------
 */
module.exports = {
  createPeriod,
  getPeriods,
  getPeriodById,
  updatePeriod,
  getActivePeriod,
  closePeriod,
  reopenPeriod,
};
