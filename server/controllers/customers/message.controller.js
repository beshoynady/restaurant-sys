const CustomerMessageModel = require("../../models/customers/message.model");
const Joi = require("joi");
const mongoose = require("mongoose");

/* =====================================================
   🔹 Joi Validation Schemas
===================================================== */

// Create message (public / customer side)
const createMessageSchema = Joi.object({
  brand: Joi.string().hex().length(24).required(),
  branch: Joi.string().hex().length(24).required(),
  senderType: Joi.string().valid("OnlineCustomer", "Table").required(),
  referenceId: Joi.string().hex().length(24).required(),
  name: Joi.string().max(100).required(),
  email: Joi.string().email().max(100).optional(),
  phone: Joi.string().max(20).required(),
  message: Joi.string().min(5).max(1000).required(),
  category: Joi.string()
    .valid("GENERAL", "COMPLAINT", "ORDER_ISSUE", "SUGGESTION")
    .optional(),
  priority: Joi.string()
    .valid("LOW", "MEDIUM", "HIGH", "URGENT")
    .optional(),
  order: Joi.string().hex().length(24).optional(),
});

// Update message workflow (staff side)
const updateMessageSchema = Joi.object({
  status: Joi.string()
    .valid("NEW", "IN_PROGRESS", "RESOLVED", "IGNORED")
    .optional(),
  isSeen: Joi.boolean().optional(),
  priority: Joi.string()
    .valid("LOW", "MEDIUM", "HIGH", "URGENT")
    .optional(),
  assignedTo: Joi.string().hex().length(24).allow(null),
});

// Pagination & filter validation
const listQuerySchema = Joi.object({
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(20),
  branch: Joi.string().hex().length(24).optional(),
  status: Joi.string()
    .valid("NEW", "IN_PROGRESS", "RESOLVED", "IGNORED")
    .optional(),
  category: Joi.string()
    .valid("GENERAL", "COMPLAINT", "ORDER_ISSUE", "SUGGESTION")
    .optional(),
  priority: Joi.string()
    .valid("LOW", "MEDIUM", "HIGH", "URGENT")
    .optional(),
  isSeen: Joi.boolean().optional(),
  phone: Joi.string().max(20).optional(),
  search: Joi.string().min(2).optional(),
});

/* =====================================================
   🔹 Create Customer Message
===================================================== */
/**
 * Create a new customer message (Contact Us / Order Issue)
 */
const createCustomerMessage = async (req, res) => {
  try {
    const brand = req.brand._id;
    const branch = req.branch._id;
    
    const { error, value } = createMessageSchema.validate({...req.body, brand, branch});
    if (error)
      return res.status(400).json({ message: error.details[0].message });

    const message = await CustomerMessageModel.create({
      ...value,
    });

    res.status(201).json({
      message: "Message sent successfully",
      data: message,
    });
  } catch (err) {
    console.error("Create customer message error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =====================================================
   🔹 Get Messages with Filters + Pagination
===================================================== */
/**
 * Get all messages with advanced filtering & pagination
 */
const getAllCustomerMessages = async (req, res) => {
  try {
    const { error, value } = listQuerySchema.validate(req.query, { abortEarly: false });
    if (error)
      return res.status(400).json({ message: error.details[0].message });

    const {
      page,
      limit,
      branch,
      status,
      category,
      priority,
      isSeen,
      phone,
      search,
    } = value;

    const filter = {
      brand: req.brand._id,
      isDeleted: false,
    };

    if (branch) filter.branch = branch;
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;
    if (isSeen !== undefined) filter.isSeen = isSeen;
    if (phone) filter.phone = phone;

    // Text-like search on name & message
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { message: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      CustomerMessageModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      CustomerMessageModel.countDocuments(filter),
    ]);

    res.json({
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      data,
    });
  } catch (err) {
    console.error("Get customer messages error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =====================================================
   🔹 Get Single Message
===================================================== */
/**
 * Get message by ID (brand scoped)
 */
const getCustomerMessageById = async (req, res) => {
  try {
    const message = await CustomerMessageModel.findOne({
      _id: req.params.id,
      brand: req.brand._id,
    }).lean();

    if (!message)
      return res.status(404).json({ message: "Message not found" });

    res.json(message);
  } catch (err) {
    console.error("Get message by ID error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =====================================================
   🔹 Update Message (Workflow)
===================================================== */
/**
 * Update message status, priority, assignment, seen
 */
const updateCustomerMessage = async (req, res) => {
  try {
    const { error, value } = updateMessageSchema.validate(req.body);
    if (error)
      return res.status(400).json({ message: error.details[0].message });

    // Auto set resolved info
    if (value.status === "RESOLVED") {
      value.resolvedAt = new Date();
      value.resolvedBy = req.user._id;
    }

    const updated = await CustomerMessageModel.findOneAndUpdate(
      {
        _id: req.params.id,
        brand: req.brand._id,
        isDeleted: false,
      },
      value,
      { new: true }
    ).lean();

    if (!updated)
      return res.status(404).json({ message: "Message not found" });

    res.json({
      message: "Message updated successfully",
      data: updated,
    });
  } catch (err) {
    console.error("Update message error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const deleteCustomerMessage = async (req, res) => {
  try {
    const deleted = await CustomerMessageModel.findOneAndDelete({
      _id: req.params.id,
      brand: req.brand._id,
    });
    if (!deleted) return res.status(404).json({ message: "Message not found" });
    res.json({ message: "Message deleted successfully" });
  } catch (err) {
    console.error("Delete message error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =====================================================
   🔹 Soft Delete Message
===================================================== */
/**
 * Soft delete a message
 */
const softDeleteCustomerMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const employeeId = req.user._id;
    const isValidId = mongoose.Types.ObjectId.isValid(id);
    if (!isValidId)      return res.status(400).json({ message: "Invalid message ID" });
    const message = await CustomerMessageModel.findOne({
      _id: id,
      brand: req.brand._id,
      isDeleted: false,
    });
    if (!message)      return res.status(404).json({ message: "Message not found" });



    const deleted = await CustomerMessageModel.findOneAndUpdate(
      {
        _id: req.params.id,
        brand: req.brand._id,
        isDeleted: false,
      },
      {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: employeeId,
      },
      { new: true }
    );

    if (!deleted)
      return res.status(404).json({ message: "Message not found" });

    res.json({ message: "Message deleted successfully" });
  } catch (err) {
    console.error("Delete message error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =====================================================
   🔹 Restore Message
===================================================== */
/**
 * Restore soft-deleted message
 */
const restoreCustomerMessage = async (req, res) => {
  try {
    const restored = await CustomerMessageModel.findOneAndUpdate(
      {
        _id: req.params.id,
        brand: req.brand._id,
        isDeleted: true,
      },
      {
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
      },
      { new: true }
    );

    if (!restored)
      return res.status(404).json({ message: "Message not found" });

    res.json({ message: "Message restored successfully" });
  } catch (err) {
    console.error("Restore message error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const getCustomerMessagesBySender = async (req, res) => {
  try {
    const { senderType, referenceId } = req.params;
    if (!["OnlineCustomer","Table"].includes(senderType)) {
      return res.status(400).json({ message: "Invalid sender type" });
    }

    if (!mongoose.Types.ObjectId.isValid(referenceId)) {
      return res.status(400).json({ message: "Invalid reference ID" });
    }

    const messages = await CustomerMessageModel.find({
      brand: req.brand._id,
      senderType,
      referenceId,
      isDeleted: false,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      message: "Messages retrieved successfully",
      messages,
    });
  } catch (err) {
    console.error("Get messages by sender error:", err);
    res.status(500).json({ message: "Server error" });
  }
};



/* =====================================================
   🔹 Exports
===================================================== */

module.exports = {
  createCustomerMessage,
  getAllCustomerMessages,
  getCustomerMessageById,
  updateCustomerMessage,
  deleteCustomerMessage,
  softDeleteCustomerMessage,
  restoreCustomerMessage,
};
