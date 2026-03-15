import express from "express";
import {
  createStockMovement,
  updateStockMovement,
  getOneStockMovement,
  getAllStockMovements,
  getAllStockMovementByStore,
  getLastStockMovementStore,
  deleteStockMovement,
} from "../../controllers/inventory/stock-ledger.controller.js";

import { authenticateToken } from "../../middlewares/authenticate.js";


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
export default router;
