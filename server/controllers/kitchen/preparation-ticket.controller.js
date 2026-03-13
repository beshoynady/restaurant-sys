const PreparationTicketModel = require("../../models/preparation-ticket.model.js");
const mongoose = require("mongoose");
const Joi = require("joi");


const createPreparationTicketSchema = Joi.object({
  brand: Joi.string().required(),
  branch: Joi.string().allow(null, ""),
  order: Joi.string().required(),
  department: Joi.string().required(),
  preparationStatus: Joi.string().valid(
    "Pending",
    "Preparing",
    "Prepared",
    "On the way",
    "Delivered",
    "Cancelled",
    "Rejected"
  ).default("Pending"),
  products: Joi.array().items(
    Joi.object({
      productId: Joi.string().required(),
      orderproductId: Joi.string().required(),
      name: Joi.string().required(),
      sizeId: Joi.string().allow(null, ""),
      size: Joi.string().allow(null, ""),
      quantity: Joi.number().required(),
      notes: Joi.string().allow(null, ""),
      extras: Joi.array().items(
        Joi.object({
          extraDetails: Joi.array().items(
            Joi.object({
              extraId: Joi.string().allow(null, ""),
              name: Joi.string().required(),
            })
          ),
        })
      ),
    }),
  ),
  isActive: Joi.boolean().default(true),
  timeReceived: Joi.date().required(),
  expectedCompletionTime: Joi.date().required(),
  notes: Joi.string().allow(null, ""),
});


/**
 * Create a new Preparation Ticket
 */

const createPreparationTicket = async (req, res) => {
  try {
    const {
      order,
      department,
      preparationStatus,
      products,
      isActive,
      timeReceived,
      expectedCompletionTime,
      notes,
    } = req.body;

    const newPreparationTicket = await PreparationTicketModel.create({
      order,
      department,
      preparationStatus,
      products,
      isActive,
      timeReceived,
      expectedCompletionTime,
      notes,
    });

    res.status(201).json({
      success: true,
      message: "Preparation ticket created successfully",
      data: newPreparationTicket,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create preparation ticket",
      error: error.message,
    });
  }
};

const getAllPreparationTickets = async (req, res) => {
  try {
    const preparationTickets = await PreparationTicketModel.find()
      .populate("order")
      .populate({
        path: "order",
        populate: {
          path: "table",
        },
      })
      .populate("products.productId", "_id name department")
      .populate("products.extras.extraDetails.extraId", "_id name")
      .populate("department", "_id name")
      .populate("responsibleEmployee", "_id username role")
      .populate("waiter", "_id fullname username role shift sectionNumber");

    res.status(200).json({
      success: true,
      data: preparationTickets,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch preparation tickets",
      error: error.message,
    });
  }
};

const getActivePreparationTickets = async (req, res) => {
  try {
    const preparationTickets = await PreparationTicketModel.find({
      isActive: true,
    })
      .populate("order")
      .populate({
        path: "order",
        populate: {
          path: "table",
        },
      })
      .populate("products.productId", "_id name department")
      .populate("products.extras.extraDetails.extraId", "_id name")
      .populate("department", "_id name")
      .populate("responsibleEmployee", "_id username role")
      .populate("waiter", "_id fullname username role shift sectionNumber");

    res.status(200).json({
      success: true,
      data: preparationTickets,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch preparation tickets",
      error: error.message,
    });
  }
};

const getPreparationTicketById = async (req, res) => {
  try {
    const { id } = req.params;

    const preparationTicket = await PreparationTicketModel.findById(id)
      .populate("order")
      .populate({
        path: "order",
        populate: {
          path: "table",
        },
      })
      .populate("products.productId", "_id name department")
      .populate("products.extras.extraDetails.extraId", "_id name")
      .populate("department", "_id name")
      .populate("responsibleEmployee", "_id username role")
      .populate("waiter", "_id fullname username role shift sectionNumber");

    if (!preparationTicket) {
      return res.status(404).json({
        success: false,
        message: "Preparation ticket not found",
      });
    }

    res.status(200).json({
      success: true,
      data: preparationTicket,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch preparation ticket",
      error: error.message,
    });
  }
};

const updatePreparationTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      preparationStatus,
      responsibleEmployee,
      waiter,
      products,
      isActive,
      actualCompletionTime,
      notes,
    } = req.body;

    const updatedPreparationTicket =
      await PreparationTicketModel.findByIdAndUpdate(
        id,
        {
          $set: {
            preparationStatus,
            responsibleEmployee,
            waiter,
            products,
            isActive,
            actualCompletionTime,
            notes,
          },
        },
        { new: true, runValidators: true }
      );

    if (!updatedPreparationTicket) {
      return res.status(404).json({
        success: false,
        message: "Preparation ticket not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Preparation ticket updated successfully",
      data: updatedPreparationTicket,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update preparation ticket",
      error: error.message,
    });
  }
};

const deletePreparationTicket = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedPreparationTicket =
      await PreparationTicketModel.findByIdAndDelete(id);

    if (!deletedPreparationTicket) {
      return res.status(404).json({
        success: false,
        message: "Preparation ticket not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Preparation ticket deleted successfully",
      data: deletedPreparationTicket,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete preparation ticket",
      error: error.message,
    });
  }
};

module.exports = {
  createPreparationTicket,
  getAllPreparationTickets,
  getActivePreparationTickets,
  getPreparationTicketById,
  updatePreparationTicket,
  deletePreparationTicket,
};
