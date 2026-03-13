const mongoose = require("mongoose");
const Joi = require("joi");
const NotificationSettings = require("../../models/settings/notification-settings.model");

// -----------------------------
// Time validation regex
// -----------------------------
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

// -----------------------------
// Joi Validation Schemas
// -----------------------------
const serviceNotificationSchema = Joi.object({
  enabled: Joi.boolean().required(),
  channels: Joi.object().pattern(
    Joi.string(),
    Joi.boolean()
  ).optional(),
  roles: Joi.object().pattern(
    Joi.string(),
    Joi.boolean()
  ).optional(),
  delayMinutes: Joi.number().min(0).optional(),
  reminderBeforeMinutes: Joi.number().min(0).optional(),
  sendAt: Joi.string().pattern(timeRegex).optional(),
});

const preparationSectionSchema = Joi.object({
  newOrder: serviceNotificationSchema.required(),
  delayedOrder: serviceNotificationSchema.optional(),
});

const createUpdateSchema = Joi.object({
  brand: Joi.string().required(),
  branch: Joi.string().required(),
  enabled: Joi.boolean().optional(),

  orders: Joi.object({
    newOrder: serviceNotificationSchema.required(),
    orderReady: serviceNotificationSchema.required(),
    orderCancelled: serviceNotificationSchema.required(),
  }).required(),

  preparationSection: preparationSectionSchema.required(),

  inventory: Joi.object({
    lowStock: serviceNotificationSchema.required(),
    outOfStock: serviceNotificationSchema.required(),
  }).required(),

  finance: Joi.object({
    shiftClosed: serviceNotificationSchema.required(),
    paymentFailed: serviceNotificationSchema.required(),
  }).required(),

  reservations: Joi.object({
    newReservation: serviceNotificationSchema.required(),
    reservationReminder: serviceNotificationSchema.optional(),
  }).required(),

  customer: Joi.object({
    orderStatusUpdates: serviceNotificationSchema.required(),
    promotions: serviceNotificationSchema.optional(),
  }).required(),

  system: Joi.object({
    dailyReport: serviceNotificationSchema.optional(),
  }).required(),

  createdBy: Joi.string().required(),
  updatedBy: Joi.string().optional(),
});

// -----------------------------
// Create Notification Settings
// -----------------------------
const createNotificationSettings = async (req, res) => {
  try {
    const {
      brand,
      branch,
      enabled,
      orders,
      preparationSection,
      inventory,
      finance,
      reservations,
      customer,
      system,
      createdBy,
    } = req.body;

    // Validate request
    const { error } = createUpdateSchema.validate(req.body);
    if (error)
      return res.status(400).json({ message: "Validation error", errors: error.details });

    // Check if settings already exist for branch
    const exists = await NotificationSettings.findOne({ branch });
    if (exists)
      return res.status(409).json({ message: "Notification settings for this branch already exist" });

    // Create new settings
    const settings = await NotificationSettings.create({
      brand,
      branch,
      enabled,
      orders,
      preparationSection,
      inventory,
      finance,
      reservations,
      customer,
      system,
      createdBy,
    });

    res.status(201).json(settings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// -----------------------------
// Get Notification Settings
// -----------------------------
const getNotificationSettings = async (req, res) => {
  try {
    const { branchId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(branchId))
      return res.status(400).json({ message: "Invalid branch id" });

    const settings = await NotificationSettings.findOne({ branch: branchId });
    if (!settings) return res.status(404).json({ message: "Settings not found" });

    res.status(200).json(settings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// -----------------------------
// Update Notification Settings
// -----------------------------
const updateNotificationSettings = async (req, res) => {
  try {
    const { branchId } = req.params;
    const {
      enabled,
      orders,
      preparationSection,
      inventory,
      finance,
      reservations,
      customer,
      system,
      updatedBy,
    } = req.body;

    const { error } = createUpdateSchema.validate({ ...req.body, branch: branchId, brand: req.body.brand || "" });
    if (error)
      return res.status(400).json({ message: "Validation error", errors: error.details });

    const updated = await NotificationSettings.findOneAndUpdate(
      { branch: branchId },
      {
        $set: {
          enabled,
          orders,
          preparationSection,
          inventory,
          finance,
          reservations,
          customer,
          system,
          updatedBy,
        },
      },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "Settings not found" });

    res.status(200).json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// -----------------------------
// Delete Notification Settings
// -----------------------------
const deleteNotificationSettings = async (req, res) => {
  try {
    const { branchId } = req.params;
    const deleted = await NotificationSettings.findOneAndDelete({ branch: branchId });

    if (!deleted) return res.status(404).json({ message: "Settings not found" });

    res.status(200).json({ message: "Notification settings deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// -----------------------------
// Export controller functions
// -----------------------------
module.exports = {
  createNotificationSettings,
  getNotificationSettings,
  updateNotificationSettings,
  deleteNotificationSettings,
};
