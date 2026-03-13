const mongoose = require("mongoose");
const Joi = require("joi");

const ProductionOrderModel = require("../../models/production-order.model");
const ProductionRecordModel = require("../../models/production-record.model");

/* ======================================================
   Helpers
====================================================== */

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const sendError = (res, status, message, details = null) => {
  return res.status(status).json({
    success: false,
    message,
    details,
  });
};

/* ======================================================
   Joi Schemas
====================================================== */

const createSchema = Joi.object({
  brand: Joi.string().required(),
  branch: Joi.string().allow(null),
  storeId: Joi.string().required(),
  preparationSection: Joi.string().required(),
  stockItem: Joi.string().required(),
  unit: Joi.string().trim().max(10).required(),
  quantityRequested: Joi.number().integer().min(1).required(),
  notes: Joi.string().trim().max(200).allow("", null),
});

const updateSchema = Joi.object({
  storeId: Joi.string().optional(),
  preparationSection: Joi.string().optional(),
  stockItem: Joi.string().optional(),
  unit: Joi.string().trim().max(10).optional(),
  quantityRequested: Joi.number().integer().min(1).optional(),
  notes: Joi.string().trim().max(200).allow("", null),
});

const statusSchema = Joi.object({
  orderStatus: Joi.string()
    .valid("approved", "rejected", "canceled")
    .required(),
});

/* ======================================================
   Controllers
====================================================== */

/**
 * @desc Create Production Order
 */
const createProductionOrder = async (req, res) => {
  try {
    const createdBy = req.user?.id;
    if (!createdBy) return sendError(res, 401, "Unauthorized");

    const { error, value } = createSchema.validate(req.body, {
      abortEarly: false,
    });
    if (error) return sendError(res, 400, "Validation error", error.details);

    const { brand, branch } = value;

    // Auto increment orderNumber per brand + branch
    const lastOrder = await ProductionOrderModel.findOne({
      brand,
      branch: branch || null,
    })
      .sort({ orderNumber: -1 })
      .select("orderNumber");

    const orderNumber = lastOrder ? lastOrder.orderNumber + 1 : 1;

    const productionOrder = await ProductionOrderModel.create({
      ...value,
      orderNumber,
      createdBy,
    });

    return res.status(201).json({
      success: true,
      data: productionOrder,
    });
  } catch (err) {
    console.error("Create Production Order Error:", err);
    return sendError(res, 500, "Dine-in server error");
  }
};

/**
 * @desc Get Production Orders (Filters + Pagination)
 */
const getProductionOrders = async (req, res) => {
  try {
    const {
      brand,
      branch,
      storeId,
      preparationSection,
      stockItem,
      orderStatus,
      createdBy,
      fromDate,
      toDate,
      page = 1,
      limit = 20,
    } = req.query;

    const filters = {};
    if (brand) filters.brand = brand;
    if (branch) filters.branch = branch;
    if (storeId) filters.storeId = storeId;
    if (preparationSection) filters.preparationSection = preparationSection;
    if (stockItem) filters.stockItem = stockItem;
    if (orderStatus) filters.orderStatus = orderStatus;
    if (createdBy) filters.createdBy = createdBy;

    if (fromDate || toDate) {
      filters.createdAt = {};
      if (fromDate) filters.createdAt.$gte = new Date(fromDate);
      if (toDate) filters.createdAt.$lte = new Date(toDate);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [data, total] = await Promise.all([
      ProductionOrderModel.find(filters)
        .populate("brand", "name")
        .populate("branch", "name")
        .populate("storeId", "storeName")
        .populate("preparationSection", "name")
        .populate("stockItem", "itemName unit")
        .populate("createdBy", "fullname")
        .populate("updatedBy", "fullname")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),

      ProductionOrderModel.countDocuments(filters),
    ]);

    return res.status(200).json({
      success: true,
      data,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Get Production Orders Error:", err);
    return sendError(res, 500, "Dine-in server error");
  }
};

/**
 * @desc Get Production Orders By Store
 */
const getProductionOrdersByStore = async (req, res) => {
  try {
    const { storeId } = req.params;

    if (!isValidObjectId(storeId)) {
      return sendError(res, 400, "Invalid store ID");
    }

    const orders = await ProductionOrderModel.find({ storeId })
      .populate("brand branch storeId preparationSection stockItem")
      .populate("createdBy updatedBy", "fullname");

    return res.status(200).json({ success: true, data: orders });
  } catch (err) {
    return sendError(res, 500, "Dine-in server error");
  }
};

/**
 * @desc Get Production Orders By Preparation Section
 */
const getProductionOrdersByPreparationSection = async (req, res) => {
  try {
    const { preparationSection } = req.params;

    if (!isValidObjectId(preparationSection)) {
      return sendError(res, 400, "Invalid preparation section ID");
    }

    const orders = await ProductionOrderModel.find({ preparationSection })
      .populate("brand branch storeId preparationSection stockItem")
      .populate("createdBy updatedBy", "fullname");

    return res.status(200).json({ success: true, data: orders });
  } catch (err) {
    return sendError(res, 500, "Dine-in server error");
  }
};

/**
 * @desc Get Single Production Order
 */
const getProductionOrder = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return sendError(res, 400, "Invalid ID");
    }

    const productionOrder = await ProductionOrderModel.findById(id)
      .populate("brand branch storeId preparationSection stockItem")
      .populate("createdBy updatedBy", "fullname role");

    if (!productionOrder) {
      return sendError(res, 404, "Production order not found");
    }

    return res.status(200).json({ success: true, data: productionOrder });
  } catch (err) {
    return sendError(res, 500, "Dine-in server error");
  }
};

/**
 * @desc Update Production Order (Pending only)
 */
const updateProductionOrder = async (req, res) => {
  try {
    const updatedBy = req.user?.id;
    if (!updatedBy) return sendError(res, 401, "Unauthorized");

    const { error, value } = updateSchema.validate(req.body, {
      abortEarly: false,
    });
    if (error) return sendError(res, 400, "Validation error", error.details);

    const order = await ProductionOrderModel.findById(req.params.id);
    if (!order) return sendError(res, 404, "Production order not found");

    if (order.orderStatus !== "Pending") {
      return sendError(res, 400, "Only Pending orders can be updated");
    }

    Object.assign(order, value, { updatedBy });
    await order.save();

    return res.status(200).json({ success: true, data: order });
  } catch (err) {
    return sendError(res, 500, "Dine-in server error");
  }
};

/**
 * @desc Update Production Order Status
 */
const updateProductionStatus = async (req, res) => {
  try {
    const updatedBy = req.user?.id;
    if (!updatedBy) return sendError(res, 401, "Unauthorized");

    const { error, value } = statusSchema.validate(req.body);
    if (error) return sendError(res, 400, "Validation error", error.details);

    const order = await ProductionOrderModel.findById(req.params.id);
    if (!order) return sendError(res, 404, "Production order not found");

    if (order.orderStatus !== "Pending") {
      return sendError(res, 400, "Production order already finalized");
    }

    order.orderStatus = value.orderStatus;
    order.updatedBy = updatedBy;
    await order.save();

    return res.status(200).json({ success: true, data: order });
  } catch (err) {
    return sendError(res, 500, "Dine-in server error");
  }
};

/**
 * @desc Delete Production Order
 * @rule Pending only + no ProductionRecord exists
 */
const deleteProductionOrder = async (req, res) => {
  try {
    const order = await ProductionOrderModel.findById(req.params.id);
    if (!order) return sendError(res, 404, "Production order not found");

    if (order.orderStatus !== "Pending") {
      return sendError(res, 400, "Only Pending orders can be deleted");
    }

    const recordExists = await ProductionRecordModel.exists({
      productionOrder: order._id,
    });

    if (recordExists) {
      return sendError(
        res,
        400,
        "Cannot delete production order: production record exists"
      );
    }

    await order.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Production order deleted successfully",
    });
  } catch (err) {
    return sendError(res, 500, "Dine-in server error");
  }
};

/* ======================================================
   Exports
====================================================== */

module.exports = {
  createProductionOrder,
  getProductionOrders,
  getProductionOrdersByStore,
  getProductionOrdersByPreparationSection,
  getProductionOrder,
  updateProductionOrder,
  updateProductionStatus,
  deleteProductionOrder,
};
