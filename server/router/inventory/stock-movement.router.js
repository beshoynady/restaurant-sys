const express = require("express");
const {
  createStockMovement,
  updateStockMovement,
  getOneStockMovement,
  getAllStockMovements,
  getAllStockMovementByStore,
  getLastStockMovementStore,
  deleteStockMovement,
} = require("../../controllers/stock-movement.controller");

const { authenticateToken } = require("../../middlewares/authenticate");


const router = express.Router();

// Routes for stock Movements
router
  .route("/")
  .post(authenticateToken,createStockMovement) // Create a new stock Movement
  .get(authenticateToken,getAllStockMovements); // Get all stock Movements

router
  .route("/:movementId")
  .get(authenticateToken,getOneStockMovement) // Get a single stock Movement by ID
  .put(authenticateToken,updateStockMovement) // Update a stock Movement by ID
  .delete(authenticateToken,deleteStockMovement); // Delete a stock Movement by ID

router
  .route("/lastmovement/:storeId")
  .get(authenticateToken,getLastStockMovementStore);
router
  .route("/allmovementstore/:storeId")
  .get(authenticateToken,getAllStockMovementByStore);
module.exports = router;
