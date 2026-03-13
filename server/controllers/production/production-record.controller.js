import productionRecordModel from "../../models/production/production-record.model.js";
import productionOrderModel from "../../models/production/production-order.model.js";
import stockItemModel from "../../models/inventory/stock-item.model.js";
import recipeModel from "../../models/menu/recipe.model.js";
import departmentModel from "../../models/employees/department.model.js";

// Create and Save a new Production Record

const createProductionRecord = async (req, res) => {
  try {
    const {
      productionOrder,
      stockItem,
      quantity,
      unit,
      department,
      recipe,
      notes,
    } = req.body;
    const productionStartTime = new Date();

    const createdBy = req.user._id;

    // Validate request
    if (
      !productionOrder ||
      !stockItem ||
      !quantity ||
      !department ||
      !unit ||
      !recipe
    ) {
      return res.status(400).send({
        message: "All fields are required",
      });
    }
    const productionOrderExists = await productionOrderModel.findById(
      productionOrder
    );
    if (!productionOrderExists) {
      return res.status(404).send({
        message: "Production Order not found",
      });
    }
    const stockItemExists = await stockItemModel.findById(stockItem);
    if (!stockItemExists) {
      return res.status(404).send({
        message: "Stock item not found",
      });
    }
    const recipeExists = await recipeModel.findById(recipe);
    if (!recipeExists) {
      return res.status(404).send({
        message: "Recipe not found",
      });
    }
    const departmentExists = await departmentModel.findById(department);
    if (!departmentExists) {
      return res.status(404).send({
        message: "Production section not found",
      });
    }
    const materialsUsedExists = await stockItemModel.find({
      _id: { $in: materialsUsed.map((m) => m.material) },
    });
    if (materialsUsedExists.length !== materialsUsed.length) {
      return res.status(404).send({
        message: "Material not found",
      });
    }

    const lastRecord = await productionRecordModel
      .findOne({}, { productionNumber: 1 })
      .sort({ productionNumber: -1 });
    let productionNumber = lastRecord ? lastRecord.productionNumber + 1 : 1;

    // Create a Production Record
    const productionRecord = productionRecordModel.create({
      productionNumber,
      stockItem,
      quantity,
      unit,
      department,
      recipe,
      notes,
      createdBy,
    });
    res.status(201).send(productionRecord);
  } catch (error) {
    res.status(500).send({
      message:
        error.message ||
        "Some error occurred while creating the Production Record.",
    });
  }
};

// Retrieve and return all production records from the database.
const findAllProductionRecords = async (req, res) => {
  try {
    const productionRecords = await productionRecordModel
      .find()
      .populate(
        "stockItem",
        "_id, itemName, SKU, storageUnit , parts, ingredientUnit, minThreshold, maxThreshold, costPerPart"
      )
      .populate("recipe")
      .populate("department", " _id, sectionName ")
      .populate("createdBy", "fullname, username, role, shift")
      .populate("updateBy", "fullname, username, role, shift");
    res.status(200).send(productionRecords);
  } catch (error) {
    res.status(500).send({
      message:
        error.message ||
        "Some error occurred while retrieving production records.",
    });
  }
};

// Find a single production record with a productionRecordId
const findProductionRecord = async (req, res) => {
  try {
    const productionRecord = await productionRecordModel
      .findById(req.params.productionRecordId)
      .populate(
        "stockItem",
        "_id, itemName, SKU, storageUnit , parts, ingredientUnit, minThreshold, maxThreshold, costPerPart"
      )
      .populate("recipe")
      .populate("department")
      .populate("createdBy", "fullname, username, role, shift")
      .populate("updateBy", "fullname, username, role, shift");

    if (!productionRecord) {
      return res.status(404).send({
        message: "Production Record not found",
      });
    }
    res.status(200).send(productionRecord);
  } catch (error) {
    res.status(500).send({
      message:
        error.message ||
        "Some error occurred while retrieving production record.",
    });
  }
};

const endProductionRecord = async (req, res) => {
  try {
    const { materialsUsed, productionStatus } = req.body;
    if (!productionStatus) {
      return res.status(400).send({
        message: "Production status is required",
      });
    }
    if (productionStatus !== "Completed") {
      return res.status(400).send({
        message: "Production status must be completed",
      });
    }

    if (!materialsUsed) {
      return res.status(400).send({
        message: "Materials used are required",
      });
    }
    const materialsUsedExists = await stockItemModel.find({
      _id: { $in: materialsUsed.map((m) => m.material) },
    });
    if (materialsUsedExists.length !== materialsUsed.length) {
      return res.status(404).send({
        message: "Material not found",
      });
    }
    const productionCost = materialsUsed.reduce(
      (total, item) => total + item.quantity * item.cost,
      0
    );

    const productionRecord = await productionRecordModel.findByIdAndUpdate(
      req.params.productionRecordId,
      {
        $set: {
          materialsUsed,
          productionCost,
          productionEndTime: new Date(),
        },
      },
      { new: true }
    );
    if (!productionRecord) {
      return res.status(404).send({
        message: "Production Record not found",
      });
    }
    res.status(200).send(productionRecord);
  } catch (error) {
    res.status(500).send({
      message:
        error.message ||
        "Some error occurred while updating the Production Record.",
    });
  }
};

// Update a production record identified by the productionRecordId in the request
const updateProductionRecord = async (req, res) => {
  try {
    const {
      stockItem,
      quantity,
      unit,
      department,
      recipe,
      materialsUsed,
      productionCost,
    } = req.body;

    const updatedBy = req.user._id;
    const productionEndTime = new Date();
    const productionRecordId = req.params.productionRecordId;

    const productionRecordExists = await productionRecordModel.findById(
      productionRecordId
    );
    if (!productionRecordExists) {
      return res.status(404).send({
        message: "Production Record not found",
      });
    }
    if (productionRecordExists.productionStatus === "Completed") {
      return res.status(400).send({
        message: "Production has already been completed",
      });
    }

    // Validate request
    if (
      !stockItem ||
      !quantity ||
      !unit ||
      !department ||
      !recipe ||
      !materialsUsed ||
      !productionEndTime ||
      !productionCost
    ) {
      return res.status(400).send({
        message: "All fields are required",
      });
    }
    const stockItemExists = await stockItemModel.findById(stockItem);
    if (!stockItemExists) {
      return res.status(404).send({
        message: "Stock item not found",
      });
    }
    const recipeExists = await recipeModel.findById(recipe);
    if (!recipeExists) {
      return res.status(404).send({
        message: "Recipe not found",
      });
    }
    const departmentExists = await departmentModel.findById(department);
    if (!departmentExists) {
      return res.status(404).send({
        message: "Production section not found",
      });
    }
    const materialsUsedExists = await stockItemModel.find({
      _id: { $in: materialsUsed.map((m) => m.material) },
    });
    if (materialsUsedExists.length !== materialsUsed.length) {
      return res.status(404).send({
        message: "Material not found",
      });
    }

    // Find production record and update it with the request body
    const productionRecord = await productionRecordModel.findByIdAndUpdate(
      req.params.productionRecordId,
      {
        $set: {
          stockItem,
          quantity,
          unit,
          department,
          recipe,
          materialsUsed,
          productionCost,
          productionEndTime,
          updatedBy,
        },
      },
      { new: true }
    );
    if (!productionRecord) {
      return res.status(404).send({
        message: "Production Record not found",
      });
    }
    res.status(200).send(productionRecord);
  } catch (error) {
    res.status(500).send({
      message:
        error.message ||
        "Some error occurred while updating the Production Record.",
    });
  }
};

// Delete a production record with the specified productionRecordId in the request
const deleteProductionRecord = async (req, res) => {
  try {
    const productionRecord = await productionRecordModel.findByIdAndRemove(
      req.params.productionRecordId
    );
    if (!productionRecord) {
      return res.status(404).send({
        message: "Production Record not found",
      });
    }
    res
      .status(200)
      .send({ message: "Production Record deleted successfully!" });
  } catch (error) {
    res.status(500).send({
      message:
        error.message ||
        "Some error occurred while deleting the Production Record.",
    });
  }
};

export  {
  createProductionRecord,
  findAllProductionRecords,
  findProductionRecord,
  endProductionRecord,
  updateProductionRecord,
  deleteProductionRecord,
};
