import mongoose from "mongoose";
import Joi from "joi";
import asyncHandler from "../../utils/asyncHandler.js";;

import LoyaltyTransaction from "../../models/loyalty/loyalty-transaction.model.js";
import LoyaltySettings from "../../models/loyalty/loyalty-settings.model.js";
import CustomerLoyalty from "../../models/loyalty/customer-loyalty.model.js";


// =====================================================
// Validation Schemas
// =====================================================

const earnPointsSchema = Joi.object({
  brand: Joi.string().required(),
  branch: Joi.string().required(),
  customerLoyalty: Joi.string().required(),
  order: Joi.string().required(),
  orderAmount: Joi.number().min(0).required(),
});

const redeemPointsSchema = Joi.object({
  brand: Joi.string().required(),
  branch: Joi.string().required(),
  customerLoyalty: Joi.string().required(),
  order: Joi.string().required(),
  points: Joi.number().min(1).required(),
});


// =====================================================
// Earn Points From Order
// =====================================================

const earnPointsFromOrder = asyncHandler(async (req, res) => {
    const brand = req.brand._id;
    const branch = req.branch._id;
  const { error, value } = earnPointsSchema.validate(req.body);

  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const settings = await LoyaltySettings.findOne({
      brand,
      isActive: true,
    }).session(session);

    if (!settings) {
      throw new Error("Loyalty program is not active for this brand");
    }

    const customer = await CustomerLoyalty.findById(
      value.customerLoyalty
    ).session(session);

    if (!customer) {
      throw new Error("Customer loyalty record not found");
    }

    // Calculate earned points
    let points =
      Math.floor(value.orderAmount / settings.currencyAmount) *
      settings.pointsPerCurrency;

    // Apply max points per order
    if (settings.maxPointsPerOrder) {
      points = Math.min(points, settings.maxPointsPerOrder);
    }

    if (points <= 0) {
      await session.abortTransaction();
      session.endSession();

      return res.json({
        message: "No points earned from this order",
      });
    }

    const newBalance = customer.points + points;

    // Calculate expiration date
    let expirationDate = null;

    if (settings.expirePointsAfterMonths > 0) {
      expirationDate = new Date();
      expirationDate.setMonth(
        expirationDate.getMonth() + settings.expirePointsAfterMonths
      );
    }

    const transaction = await LoyaltyTransaction.create(
      [
        {
          brand,
          branch,
          customerLoyalty: value.customerLoyalty,
          type: "earn",
          points,
          balanceAfter: newBalance,
          order: value.order,
          expirationDate,
          createdBy: req.user._id,
        },
      ],
      { session }
    );

    customer.points = newBalance;
    await customer.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      message: "Points earned successfully",
      data: transaction[0],
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();

    res.status(400).json({
      message: err.message,
    });
  }
});


// =====================================================
// Redeem Points From Order
// =====================================================

const redeemPointsFromOrder = asyncHandler(async (req, res) => {
    const brand = req.brand._id;
    const branch = req.branch._id;
  const { error, value } = redeemPointsSchema.validate(req.body);

  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const settings = await LoyaltySettings.findOne({
      brand,
      isActive: true,
    }).session(session);

    if (!settings) {
      throw new Error("Loyalty program is not active");
    }

    const customer = await CustomerLoyalty.findById(
      value.customerLoyalty
    ).session(session);

    if (!customer) {
      throw new Error("Customer not found");
    }

    if (customer.points < value.points) {
      throw new Error("Not enough points");
    }

    if (value.points < settings.minimumRedeemPoints) {
      throw new Error("Minimum redeem points not reached");
    }

    const newBalance = customer.points - value.points;

    const transaction = await LoyaltyTransaction.create(
      [
        {
          brand,
          branch,
          customerLoyalty: value.customerLoyalty,
          type: "redeem",
          points: value.points,
          balanceAfter: newBalance,
          order: value.order,
          createdBy: req.user._id,
        },
      ],
      { session }
    );

    customer.points = newBalance;
    await customer.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.json({
      message: "Points redeemed successfully",
      data: transaction[0],
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();

    res.status(400).json({
      message: err.message,
    });
  }
});


// =====================================================
// Get Customer Transactions
// =====================================================

const getCustomerTransactions = asyncHandler(async (req, res) => {
  const brand = req.brand._id;
  const branch = req.branch._id;
  const transactions = await LoyaltyTransaction.find({
    brand,
    branch,
    customerLoyalty: req.params.customerId,
  })
    .sort({ createdAt: -1 })
    .populate("order reward");

  res.json({
    count: transactions.length,
    data: transactions,
  });
});


// =====================================================
// Admin Adjustment
// =====================================================

const adjustPoints = asyncHandler(async (req, res) => {
    const brand = req.brand._id;
    const branch = req.branch._id;
    
  const schema = Joi.object({
    brand: Joi.string().required(),
    branch: Joi.string().required(),
    customerLoyalty: Joi.string().required(),
    points: Joi.number().required(),
    note: Joi.string().max(300),
  });

  const { error, value } = schema.validate(req.body);

  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const customer = await CustomerLoyalty.findById(value.customerLoyalty);

  if (!customer) {
    return res.status(404).json({ message: "Customer not found" });
  }

  const newBalance = customer.points + value.points;

  if (newBalance < 0) {
    return res.status(400).json({
      message: "Points balance cannot be negative",
    });
  }

  const transaction = await LoyaltyTransaction.create({
    brand,
    branch,
    customerLoyalty: value.customerLoyalty,
    type: "adjustment",
    points: value.points,
    balanceAfter: newBalance,
    note: value.note,
    createdBy: req.user._id,
  });

  customer.points = newBalance;

  await customer.save();

  res.json({
    message: "Points adjusted successfully",
    data: transaction,
  });
});


export  {
  earnPointsFromOrder,
  redeemPointsFromOrder,
  getCustomerTransactions,
  adjustPoints,
};