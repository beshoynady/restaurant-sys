const StoreModel = require("../models/store.model"); // Adjust the path as needed

// Create a new store
const createStore = async (req, res, next) => {
  try {
    const { storeName, storeCode, description, address, storekeeper, status } =
      req.body;

    const createdBy = req.employee.id; // Assume the logged-in employee's ID is available

    // Validate required fields
    if (!storeName || !storeCode || !description || !address || !storekeeper) {
      return res.status(400).json({ error: "All fields are required." });
    }

    // Check if a store with the same name or code already exists
    const existingStore = await StoreModel.findOne({
      $or: [{ storeName }, { storeCode }],
    });
    if (existingStore) {
      return res
        .status(400)
        .json({ error: "Store name or code already exists." });
    }

    // Create a new store
    const newStore = await StoreModel.create({
      storeName,
      storeCode,
      description,
      address,
      storekeeper,
      status: status || "active", // Default status to 'active' if not provided
      createdBy,
    });

    res.status(201).json(newStore);
  } catch (error) {
    res
      .status(500)
      .json({
        error: "An error occurred while creating the store.",
        details: error.message,
      });
    next(error);
  }
};

// Get all stores
const getAllStores = async (req, res) => {
  try {
    const stores = await StoreModel.find({})
      .populate("storekeeper", "_id fullname role shift") // Select only needed fields
      .populate("createdBy", "_id fullname role shift");
    res.status(200).json(stores);
  } catch (error) {
    res
      .status(500)
      .json({
        error: "An error occurred while fetching stores.",
        details: error.message,
      });
  }
};

// Get a single store by ID
const getStoreById = async (req, res) => {
  const { id } = req.params;
  try {
    const store = await StoreModel.findById(id)
      .populate("storekeeper", "_id fullname role shift")
      .populate("createdBy", "_id fullname role shift");
    if (!store) {
      return res.status(404).json({ error: "Store not found." });
    }
    res.status(200).json(store);
  } catch (error) {
    res
      .status(500)
      .json({
        error: "An error occurred while fetching the store.",
        details: error.message,
      });
  }
};

// Update a store
const updateStore = async (req, res) => {
  const { id } = req.params;
  const { storeName, storeCode, description, address, storekeeper, status } =
    req.body;
  const updatedBy = req.employee.id;

  try {
    const updatedStore = await StoreModel.findByIdAndUpdate(
      id,
      {
        storeName,
        storeCode,
        description,
        address,
        storekeeper,
        status,
        updatedBy,
      },
      { new: true, runValidators: true }
    )
      .populate("storekeeper", "_id fullname role shift")
      .populate("createdBy", "_id fullname role shift");
    if (!updatedStore) {
      return res.status(404).json({ error: "Store not found." });
    }
    res.status(200).json(updatedStore);
  } catch (error) {
    res
      .status(500)
      .json({
        error: "An error occurred while updating the store.",
        details: error.message,
      });
  }
};

// Delete a store
const deleteStore = async (req, res) => {
  const { id } = req.params;
  try {
    const deletedStore = await StoreModel.findByIdAndDelete(id);
    if (!deletedStore) {
      return res.status(404).json({ error: "Store not found." });
    }
    res.status(200).json({ message: "Store deleted successfully." });
  } catch (error) {
    res
      .status(500)
      .json({
        error: "An error occurred while deleting the store.",
        details: error.message,
      });
  }
};

module.exports = {
  createStore,
  getAllStores,
  getStoreById,
  updateStore,
  deleteStore,
};
