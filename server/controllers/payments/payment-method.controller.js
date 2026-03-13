const mongoose = require("mongoose");
const Joi = required("joi");
import PaymentMethodModel from "../../models/settings/payment-method.model.js";

const ObjectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/);

// ============================
// Joi Validation Schema
// ============================
const paymentMethodSchema = Joi.object({
  brand: ObjectId.required(),
  branch: ObjectId.allow(null, "").optional(),

  name: Joi.object().required(), // Map of translations

  paymentCategory: Joi.string()
    .valid(
      "Cash",
      "Card",
      "MobileWallet",
      "OnlineGateway",
      "Credit",
      "Voucher",
      "Dine-in",
      "Other"
    )
    .required(),

  paymentType: Joi.string().valid("Offline", "Online").optional(),

  openCashDrawer: Joi.boolean().optional(),
  requiresReference: Joi.boolean().optional(),
  allowSplit: Joi.boolean().optional(),
  isDefault: Joi.boolean().optional(),
  icon: Joi.string().max(100).optional(),
  isActive: Joi.boolean().optional(),
  notes: Joi.string().max(100).optional(),
});

// ============================
// Create Payment Method
// ============================
const createPaymentMethod = async (req, res) => {
  try {
    const { error, value } = paymentMethodSchema.validate(req.body, {
      abortEarly: false,
    });
    if (error)
      return res
        .status(400)
        .json({ message: "Validation error", errors: error.details });

    const { brand, branch } = value;

    // Check duplicate default payment method
    if (value.isDefault) {
      const existingDefault = await PaymentMethodModel.findOne({
        brand,
        branch: branch || null,
        isDefault: true,
      });
      if (existingDefault)
        return res
          .status(409)
          .json({
            message:
              "A default payment method already exists for this brand/branch",
          });
    }

    const created = await PaymentMethodModel.create(value);
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ============================
// Update Payment Method
// ============================
const updatePaymentMethod = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: "Invalid payment method ID" });

    const { error, value } = paymentMethodSchema.validate(req.body, {
      abortEarly: false,
    });
    if (error)
      return res
        .status(400)
        .json({ message: "Validation error", errors: error.details });

    // Prevent duplicate default
    if (value.isDefault) {
      const pm = await PaymentMethodModel.findOne({
        brand: value.brand,
        branch: value.branch || null,
        isDefault: true,
        _id: { $ne: id },
      });
      if (pm)
        return res
          .status(409)
          .json({
            message:
              "Another default payment method exists for this brand/branch",
          });
    }

    const updated = await PaymentMethodModel.findByIdAndUpdate(
      id,
      { $set: value },
      { new: true }
    );
    if (!updated)
      return res.status(404).json({ message: "Payment method not found" });

    res.status(200).json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ============================
// Get Payment Methods
// ============================
const getPaymentMethods = async (req, res) => {
  try {
    const { brand, branch } = req.query;

    const filter = {};
    if (brand) filter.brand = brand;
    if (branch) filter.branch = branch;

    const methods = await PaymentMethodModel.find(filter).sort({
      createdAt: 1,
    });
    res.status(200).json(methods);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ============================
// Delete Payment Method
// ============================
const deletePaymentMethod = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: "Invalid payment method ID" });

    const deleted = await PaymentMethodModel.findByIdAndDelete(id);
    if (!deleted)
      return res.status(404).json({ message: "Payment method not found" });

    res.status(200).json({ message: "Payment method deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export {
  createPaymentMethod,
  updatePaymentMethod,
  getPaymentMethods,
  deletePaymentMethod,
};
