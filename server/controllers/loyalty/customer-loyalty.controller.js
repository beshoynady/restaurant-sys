const CustomerLoyaltyModel = require("../../models/customer-loyalty.model");
const { asyncHandler } = require("../../utils/async-handler");
const joi = require("joi");

// validation schema for creating/updating customer loyalty

const createdCustomerLoyaltySchema = joi.object({
  brand: joi.string().required(),
  phone: joi.string().max(30).required(),
  points: joi.number().min(0),
});

const updatedCustomerLoyaltySchema = joi.object({
  brand: joi.string(),
  phone: joi.string().max(30),
  points: joi.number().min(0),
});

// Create a new customer loyalty
const createCustomerLoyalty = asyncHandler(async (req, res) => {
  const { brand } = req.brand._id;
  const createdBy = req.user._id; // Assuming you have authentication middleware that sets req.user
  const { error, value } = createdCustomerLoyaltySchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  const {phone, points} = value;
  const existing = await CustomerLoyaltyModel.findOne({ brand, phone });

  if (existing) {
    return res.status(409).json({
      error: "Customer loyalty already exists for this phone",
    });
  }
  const newLoyalty = new CustomerLoyaltyModel({
    brand,
    phone,
    points: points || 0,
    tier: tier || "regular",
    totalEarned: totalEarned || 0,
    totalRedeemed: totalRedeemed || 0,
    createdBy,
  });
  const savedLoyalty = await newLoyalty.save();
  res.status(201).json({
    message: "Customer loyalty created successfully",
    loyalty: savedLoyalty,
  });
});

// Get customer loyalty by id
const getCustomerLoyalty = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const loyalty = await CustomerLoyaltyModel.findById(id);
  if (!loyalty) {
    return res.status(404).json({ error: "Customer loyalty not found" });
  }
  res.status(200).json({
    message: "Customer loyalty retrieved successfully",
    loyalty,
  });
});

const getCustomerLoyaltyByPhone = asyncHandler(async (req, res) => {
  const { brand } = req.brand._id;
  if (!brand) {
    return res.status(400).json({ error: "Brand is required" });
  }
  const { phone } = req.query;
  if (!phone) {
    return res.status(400).json({ error: "Phone number is required" });
  }
  const loyalty = await CustomerLoyaltyModel.findOne({ brand, phone });
  if (!loyalty) {
    return res.status(404).json({ error: "Customer loyalty not found" });
  }
  res.status(200).json({
    message: "Customer loyalty retrieved successfully",
    loyalty,
  });
});

const getallCustomerLoyalty = asyncHandler(async (req, res) => {
  const { brand } = req.brand._id;
  const { page, limit } = req.query;
  if (!brand) {
    return res.status(400).json({ error: "Brand is required" });
  }
  const pageNumber = parseInt(page) || 1;
  const limitNumber = parseInt(limit) || 10;

  const loyalties = await CustomerLoyaltyModel.find({ brand })
    .skip((pageNumber - 1) * limitNumber)
    .limit(limitNumber);
  res.status(200).json({
    message: "Customer loyalties retrieved successfully",
    loyalties,
  });
});

// Update customer loyalty by id
const updateCustomerLoyalty = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updatedBy = req.user._id; // Assuming you have authentication middleware that sets req.user
  const { error, value } = updatedCustomerLoyaltySchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  const loyalty = await CustomerLoyaltyModel.findById(id);
  if (!loyalty) {
    return res.status(404).json({ error: "Customer loyalty not found" });
  }
  const updatedLoyalty = await CustomerLoyaltyModel.findByIdAndUpdate(
    id,
    { ...value, updatedBy },
    { new: true },
  );
  res.status(200).json({
    message: "Customer loyalty updated successfully",
    loyalty: updatedLoyalty,
  });
});

// Special endpoint to update only the tier and tierUpdatedAt fields

const updateTierCustomerLoyalty = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updatedBy = req.user._id; // Assuming you have authentication middleware that sets req.user

  const { error, value } = joi
    .object({
      tier: joi.string().valid("regular", "silver", "gold", "vip").required(),
    })
    .validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  const loyalty = await CustomerLoyaltyModel.findById(id);
  if (!loyalty) {
    return res.status(404).json({ error: "Customer loyalty not found" });
  }
  loyalty.tier = value.tier;
  loyalty.tierUpdatedAt = new Date();
  loyalty.updatedBy = updatedBy;
  await loyalty.save();
  res.status(200).json({
    message: "Customer loyalty tier updated successfully",
    loyalty,
  });
});
// delete customer loyalty by id
const deleteCustomerLoyalty = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const loyalty = await CustomerLoyaltyModel.findById(id);
  if (!loyalty) {
    return res.status(404).json({ error: "Customer loyalty not found" });
  }
  await CustomerLoyaltyModel.findByIdAndDelete(id);
  res.json({ message: "Customer loyalty deleted successfully" });
});

module.exports = {
  createCustomerLoyalty,
  getCustomerLoyalty,
  getallCustomerLoyalty,
  getCustomerLoyaltyByPhone,
  updateCustomerLoyalty,
  updateTierCustomerLoyalty,
  deleteCustomerLoyalty,
};
