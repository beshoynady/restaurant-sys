const mongoose = require("mongoose");
const Joi = require("joi");

const asyncHandler= require("../../utils/asyncHandler");;

const LoyaltyReward = require("../../models/loyalty/loyalty-reward.model");

/**
 * Joi Validation Schemas
 */

// Create reward validation
const createRewardSchema = Joi.object({
  brand: Joi.string().required(),
  branch: Joi.string().allow(null),
  name: Joi.string().max(120).required(),
  description: Joi.string().max(300).allow("", null),

  pointsRequired: Joi.number().min(1).required(),

  rewardType: Joi
    .string()
    .valid("discount", "product", "gift")
    .required(),

  product: Joi.string().allow(null),

  discountAmount: Joi.number().min(0).allow(null),

  maxRedemptionsPerCustomer: Joi.number().min(0).allow(null),

  maxTotalRedemptions: Joi.number().min(0).allow(null),

  startDate: Joi.date().allow(null),

  endDate: Joi.date().allow(null),

  isActive: Joi.boolean(),

  createdBy: Joi.string().required(),
});

// Update reward validation
const updateRewardSchema = Joi.object({
  name: Joi.string().max(120),

  description: Joi.string().max(300).allow("", null),

  pointsRequired: Joi.number().min(1),

  rewardType: Joi.string().valid("discount", "product", "gift"),

  product: Joi.string().allow(null),

  discountAmount: Joi.number().min(0).allow(null),

  maxRedemptionsPerCustomer: Joi.number().min(0).allow(null),

  maxTotalRedemptions: Joi.number().min(0).allow(null),

  startDate: Joi.date().allow(null),

  endDate: Joi.date().allow(null),

  isActive: Joi.boolean(),

  updatedBy: Joi.string(),
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