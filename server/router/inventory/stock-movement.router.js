const express = require("express");
const {
  createStockMovement,
  updateStockMovement,
  getOneStockMovement,
  getAllStockMovements,
  getAllStockMovementByStore,
  getLastStockMovementStore,
  deleteStockMovement,
} = require("../controllers/stock-movement.controller");

const { authenticateToken } = require("../../middlewares/authenticate");
const checkSubscription = require("../../middlewares/checkSubscription");

const router = express.Router();

// Routes for stock Movements
router
  .route("/")
  .post(authenticateToken, checkSubscription, createStockMovement) // Create a new stock Movement
  .get(authenticateToken, checkSubscription, getAllStockMovements); // Get all stock Movements

router
  .route("/:movementId")
  .get(authenticateToken, checkSubscription, getOneStockMovement) // Get a single stock Movement by ID
  .put(authenticateToken, checkSubscription, updateStockMovement) // Update a stock Movement by ID
  .delete(authenticateToken, checkSubscription, deleteStockMovement); // Delete a stock Movement by ID

router
  .route("/lastmovement/:storeId")
  .get(authenticateToken, checkSubscription, getLastStockMovementStore);
router
  .route("/allmovementstore/:storeId")
  .get(authenticateToken, checkSubscription, getAllStockMovementByStore);
module.exports = router;
