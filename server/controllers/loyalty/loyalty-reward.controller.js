const mongoose = require("mongoose");
const joi = require("joi");

const { asyncHandler } = require("../../utils/async-handler");

const LoyaltyReward = require("../../models/loyalty/loyalty-reward.model");

/**
 * Joi Validation Schemas
 */

// Create reward validation
const createRewardSchema = joi.object({
  brand: joi.string().required(),
  branch: joi.string().allow(null),
  name: joi.string().max(120).required(),
  description: joi.string().max(300).allow("", null),

  pointsRequired: joi.number().min(1).required(),

  rewardType: joi
    .string()
    .valid("discount", "product", "gift")
    .required(),

  product: joi.string().allow(null),

  discountAmount: joi.number().min(0).allow(null),

  maxRedemptionsPerCustomer: joi.number().min(0).allow(null),

  maxTotalRedemptions: joi.number().min(0).allow(null),

  startDate: joi.date().allow(null),

  endDate: joi.date().allow(null),

  isActive: joi.boolean(),

  createdBy: joi.string().required(),
});

// Update reward validation
const updateRewardSchema = joi.object({
  name: joi.string().max(120),

  description: joi.string().max(300).allow("", null),

  pointsRequired: joi.number().min(1),

  rewardType: joi.string().valid("discount", "product", "gift"),

  product: joi.string().allow(null),

  discountAmount: joi.number().min(0).allow(null),

  maxRedemptionsPerCustomer: joi.number().min(0).allow(null),

  maxTotalRedemptions: joi.number().min(0).allow(null),

  startDate: joi.date().allow(null),

  endDate: joi.date().allow(null),

  isActive: joi.boolean(),

  updatedBy: joi.string(),
});

/**
 * @desc    Create loyalty reward
 * @route   POST /api/loyalty-rewards
 */
const createReward = asyncHandler(async (req, res) => {
    const brand = req.brand._id;
    const branch = req.branch._id;
  const { error, value } = createRewardSchema.validate(req.body);

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  const reward = await LoyaltyReward.create({ ...value, brand, branch });

  res.status(201).json({
    success: true,
    data: reward,
  });
});

/**
 * @desc    Get all rewards
 * @route   GET /api/loyalty-rewards
 */
const getAllRewards = asyncHandler(async (req, res) => {
    const brand = req.brand._id;
    const branch = req.branch._id;
   const rewards = await LoyaltyReward.find({ brand, branch })
    .populate("product", "name price")
    .sort({ createdAt: -1 });   

  res.json({
    success: true,
    count: rewards.length,
    data: rewards,
  });
});

/**
 * @desc    Get single reward
 * @route   GET /api/loyalty-rewards/:id
 */
const getReward = asyncHandler(async (req, res) => {
  const reward = await LoyaltyReward.findById(req.params.id)
    .populate("product", "name price");

  if (!reward) {
    return res.status(404).json({
      success: false,
      message: "Reward not found",
    });
  }

  res.json({
    success: true,
    data: reward,
  });
});

/**
 * @desc    Update reward
 * @route   PUT /api/loyalty-rewards/:id
 */
const updateReward = asyncHandler(async (req, res) => {
  const { error } = updateRewardSchema.validate(req.body);

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  const reward = await LoyaltyReward.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  if (!reward) {
    return res.status(404).json({
      success: false,
      message: "Reward not found",
    });
  }

  res.json({
    success: true,
    data: reward,
  });
});

/**
 * @desc    Delete reward
 * @route   DELETE /api/loyalty-rewards/:id
 */
const deleteReward = asyncHandler(async (req, res) => {
  const reward = await LoyaltyReward.findById(req.params.id);

  if (!reward) {
    return res.status(404).json({
      success: false,
      message: "Reward not found",
    });
  }

  await reward.deleteOne();

  res.json({
    success: true,
    message: "Reward deleted successfully",
  });
});

/**
 * @desc    Get active rewards
 * @route   GET /api/loyalty-rewards/active
 */
const getActiveRewards = asyncHandler(async (req, res) => {
  const now = new Date();

  const rewards = await LoyaltyReward.find({
    isActive: true,
    $or: [
      { startDate: null },
      { startDate: { $lte: now } }
    ],
    $or: [
      { endDate: null },
      { endDate: { $gte: now } }
    ],
  }).populate("product", "name price");

  res.json({
    success: true,
    count: rewards.length,
    data: rewards,
  });
});

module.exports = {
  createReward,
  getAllRewards,
  getReward,
  updateReward,
  deleteReward,
  getActiveRewards,
};