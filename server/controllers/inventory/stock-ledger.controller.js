import StockMovementModel from "../../models/inventory/stock-ledger.model.js";



// Controller function to create a new stock movement movement
const createStockMovement = async (req, res, next) => {
  try {
    // Destructure the relevant fields from the request body
    const {
      itemId,
      storeId,
      categoryId,
      costMethod,
      source,
      unit,
      inbound = {},
      outbound = {},
      balance,
      remainingQuantity = 0,
      movementDate,
      description, // Changed notes to description
      expirationDate,
      sender, // Added sender
      receiver, // Added receiver
    } = req.body;

    const createdBy = req.user?.id;

    // Validate required fields
    if (
      !itemId ||
      !storeId ||
      !categoryId ||
      !costMethod ||
      !source ||
      !balance ||
      !sender ||
      !receiver ||
      !description
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Validate cost method
    const validCostMethods = ["FIFO", "LIFO", "Weighted Average"];
    if (!validCostMethods.includes(costMethod)) {
      return res.status(400).json({ message: "Invalid cost method" });
    }

    // Create a new stock movement movement using the provided data
    const newStockMovement = await StockMovementModel.create({
      itemId,
      storeId,
      categoryId,
      costMethod,
      source,
      description,
      unit,
      inbound,
      outbound,
      balance,
      remainingQuantity,
      movementDate,
      expirationDate,
      sender,
      receiver, // Include sender and receiver
      createdBy,
    });

    // Respond with the created stock movement movement
    res.status(201).json(newStockMovement);
  } catch (error) {
    // Log and handle any errors during the creation process
    console.error("Error creating stock movement:", error);
    next(error); // Pass the error to the next middleware (e.g., an error handler)
  }
};

// Controller function to update an existing stock movement movement
const updateStockMovement = async (req, res, next) => {
  try {
    const {
      itemId,
      storeId,
      categoryId,
      costMethod,
      source,
      unit,
      inbound,
      outbound,
      balance,
      remainingQuantity,
      movementDate,
      notes,
      expirationDate,
      sender, // Added sender
      receiver, // Added receiver
    } = req.body;
    const updatedBy = req.user.id;
    const movementId = req.params.movementId;

    const findMovement = await StockMovementModel.findById(movementId);
    if (!findMovement) {
      return res.status(400).json({ message: "movement not found" });
    }

    // Find and update the stock movement movement by ID
    const updatedMovement = await StockMovementModel.findByIdAndUpdate(
      movementId,
      {
        $set: {
          itemId,
          storeId,
          categoryId,
          costMethod,
          source,
          unit,
          inbound,
          outbound,
          balance,
          remainingQuantity,
          movementDate,
          updatedBy,
          notes,
          expirationDate,
          sender, // Include sender in update
          receiver, // Include receiver in update
        },
      },
      { new: true } // Return the updated document
    );

    if (!updatedMovement) {
      return res.status(404).json({ message: "movement not found" });
    }

    // Respond with the updated stock movement movement
    res.status(200).json(updatedMovement);
  } catch (error) {
    // Handle any errors during the update process
    console.error("Error updating stock movement:", error);
    next(error);
  }
};

// Controller function to get all stock movement movements
const getAllStockMovements = async (req, res, next) => {
  try {
    const allMovements = await StockMovementModel.find({})
      .populate("itemId")
      .populate("storeId")
      .populate("categoryId")
      .populate("createdBy")
      .populate("sender") // Populate sender
      .populate("receiver"); // Populate receiver

    if (!allMovements) {
      return res.status(200).json([]);
    }
    res.status(200).json(allMovements);
  } catch (error) {
    // Handle any errors during the retrieval process
    console.error("Error retrieving stock movements:", error);
    next(error);
  }
};

// Controller function to get a single stock movement movement by ID
const getOneStockMovement = async (req, res, next) => {
  try {
    const movementId = req.params.movementId;
    const movement = await StockMovementModel.findById(movementId)
      .populate("itemId")
      .populate("storeId")
      .populate("categoryId")
      .populate("createdBy")
      .populate("sender") // Populate sender
      .populate("receiver"); // Populate receiver

    if (!movement) {
      return res.status(404).json({ message: "movement not found" });
    }

    res.status(200).json(movement);
  } catch (error) {
    // Handle any errors during the retrieval process
    console.error("Error retrieving stock movement:", error);
    next(error);
  }
};

const getAllStockMovementByStore = async (req, res, next) => {
  try {
    const { storeId } = req.params;
    const allStockMovementByStore = await StockMovementModel.find({ storeId })
      .sort({ createdAt: -1 })
      .populate("itemId")
      .populate("storeId")
      .populate("categoryId")
      .populate("createdBy")
      .populate("sender") // Populate sender
      .populate("receiver"); // Populate receiver

    if (!allStockMovementByStore) {
      return res.status(200).json([]);
    }

    res.status(200).json(allStockMovementByStore);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getLastStockMovementStore = async (req, res, next) => {
  try {
    const { storeId } = req.params;
    const lastMovement = await StockMovementModel.findOne({ storeId })
      .sort({ createdAt: -1 })
      .populate("itemId")
      .populate("storeId")
      .populate("categoryId")
      .populate("createdBy")
      .populate("sender") // Populate sender
      .populate("receiver"); // Populate receiver

    if (!lastMovement) {
      return res.status(200).json([]);
    }

    res.status(200).json(lastMovement);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Controller function to delete a stock movement movement by ID
const deleteStockMovement = async (req, res, next) => {
  try {
    const movementId = req.params.movementId;
    const deletedMovement = await StockMovementModel.findByIdAndDelete(
      movementId
    );

    if (!deletedMovement) {
      return res.status(404).json({ message: "movement not found" });
    }

    // Respond with the deleted movement
    res.status(200).json(deletedMovement);
  } catch (error) {
    // Handle any errors during the deletion process
    console.error("Error deleting stock movement:", error);
    next(error);
  }
};

export  {
  createStockMovement,
  updateStockMovement,
  getOneStockMovement,
  getAllStockMovements,
  getAllStockMovementByStore,
  getLastStockMovementStore,
  deleteStockMovement,
};
