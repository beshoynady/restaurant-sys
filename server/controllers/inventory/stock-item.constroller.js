const mongoose = require("mongoose");
const StockItemsModel = require("../models/stock-items.model");

// Create a new stock item
const createStockItem = async (req, res) => {
  try {
    const {
      SKU,
      itemName,
      categoryId,
      stores,
      storageUnit,
      parts,
      ingredientUnit,
      minThreshold,
      maxThreshold,
      reorderQuantity,
      costMethod,
      costPerPart,
      isActive,
      notes,
    } = req.body;

    const createdBy = req.employee.id;

    // Check for unique SKU
    const existingItem = await StockItemsModel.findOne({ SKU });
    if (existingItem) {
      return res
        .status(400)
        .json({ error: "Item with this SKU already exists." });
    }

    // Create new stock item
    const newStockItem = await StockItemsModel.create({
      SKU,
      itemName,
      categoryId,
      stores,
      storageUnit,
      parts,
      ingredientUnit,
      minThreshold,
      maxThreshold,
      reorderQuantity,
      costMethod,
      costPerPart,
      isActive,
      createdBy,
      notes,
    });

    res.status(201).json(newStockItem);
  } catch (err) {
    res.status(500).json({ error: `Failed to create item: ${err.message}` });
  }
};

// Get all stock items
const getAllStockItems = async (req, res) => {
  try {
    const allItems = await StockItemsModel.find({})
      .populate("categoryId")
      .populate("stores")
      .populate("createdBy");
    res.status(200).json(allItems);
  } catch (err) {
    res.status(500).json({ error: `Failed to retrieve items: ${err.message}` });
  }
};

// Get a single stock item by ID
const getOneItem = async (req, res) => {
  try {
    const itemId = req.params.itemId;

    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({ error: "Invalid item ID format." });
    }

    const oneItem = await StockItemsModel.findById(itemId)
      .populate("categoryId")
      .populate("stores")
      .populate("createdBy");

    if (!oneItem) {
      return res.status(404).json({ error: "Item not found." });
    }

    res.status(200).json(oneItem);
  } catch (err) {
    res.status(500).json({ error: `Failed to retrieve item: ${err.message}` });
  }
};

// Update a stock item by ID
const updateStockItem = async (req, res) => {
  try {
    const itemId = req.params.itemId;
    const updatedBy = req.employee.id;
    const updatedData = req.body;

    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({ error: "Invalid item ID format." });
    }

    const existingItem = await StockItemsModel.findOne({
      SKU: updatedData.SKU,
    });
    if (existingItem && existingItem._id.toString() !== itemId) {
      return res
        .status(400)
        .json({ error: "Item with this SKU already exists." });
    }
    // Add the updatedBy field to the updated data
    updatedData.updatedBy = updatedBy;

    const updatedStockItem = await StockItemsModel.findByIdAndUpdate(
      itemId,
      updatedData,
      { new: true, runValidators: true }
    );

    if (!updatedStockItem) {
      return res.status(404).json({ error: "Item not found." });
    }

    res.status(200).json(updatedStockItem);
  } catch (err) {
    res.status(500).json({ error: `Failed to update item: ${err.message}` });
  }
};

// Delete a stock item by ID
const deleteItem = async (req, res) => {
  try {
    const itemId = req.params.itemId;

    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({ error: "Invalid item ID format." });
    }

    const deletedItem = await StockItemsModel.findByIdAndDelete(itemId);

    if (!deletedItem) {
      return res.status(404).json({ error: "Item not found." });
    }

    res
      .status(200)
      .json({ message: "Item deleted successfully.", deletedItem });
  } catch (err) {
    res.status(500).json({ error: `Failed to delete item: ${err.message}` });
  }
};

module.exports = {
  createStockItem,
  getAllStockItems,
  getOneItem,
  updateStockItem,
  deleteItem,
};
