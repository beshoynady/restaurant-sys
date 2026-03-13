/**
 * Delivery Area Router
 * -------------------
 * Routes for managing delivery areas
 * - Create, update, soft delete, restore, hard delete
 * - Get by branch or by code
 */

import express from "express";
const router = express.Router();

import {
  createDeliveryArea,
  getDeliveryAreaById,
  updateDeliveryArea,
  getDeliveryAreasByBranch,
  getActiveDeliveryAreasByBranch,
  getDeliveryAreaByCode,
  softDeleteDeliveryArea,
  restoreDeliveryArea,
  hardDeleteDeliveryArea,
} from "../../controllers/core/delivery-area.controller.js";

import { authenticateToken } from "../../middlewares/authenticate.js";

/* -------------------------------------------------------------------------- */
/*                                 🚀 Endpoints                               */
/* -------------------------------------------------------------------------- */

// Create a new delivery area
router
  .route("/")
  .post(authenticateToken, createDeliveryArea)
  .get(authenticateToken, getDeliveryAreaById);

// Get all delivery areas for current branch
router.get("/branch/:id", authenticateToken, getDeliveryAreasByBranch);

// Get active delivery areas for current branch
router.get("/active", authenticateToken, getActiveDeliveryAreasByBranch);

// Get delivery area by code (unique per branch)
router.get("/code/:code", authenticateToken, getDeliveryAreaByCode);

// Update a delivery area by ID
router.put("/:id", authenticateToken, updateDeliveryArea);

// Soft delete a delivery area by ID
router.patch("/archive/:id", authenticateToken, softDeleteDeliveryArea);

// Restore a soft-deleted delivery area by ID
router.patch("/restore/:id", authenticateToken, restoreDeliveryArea);

// Hard delete a delivery area by ID
router.delete("/delete/:id", authenticateToken, hardDeleteDeliveryArea);

export default router;