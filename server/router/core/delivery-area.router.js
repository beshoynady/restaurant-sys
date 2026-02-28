/**
 * Delivery Area Router
 * -------------------
 * Routes for managing delivery areas
 * - Create, update, soft delete, restore, hard delete
 * - Get by branch or by code
 */

const express = require("express");
const router = express.Router();

const {
  createDeliveryArea,
  updateDeliveryArea,
  getDeliveryAreasByBranch,
  getActiveDeliveryAreasByBranch,
  getDeliveryAreaByCode,
  softDeleteDeliveryArea,
  restoreDeliveryArea,
  hardDeleteDeliveryArea,
} = require("../../controllers/core/delivery-area.controller");

const { authenticateToken } = require("../../middlewares/authenticate");

// ======================================
// 🚀 Routes
// ======================================

// Create new delivery area
router.post("/", authenticateToken, createDeliveryArea);

// Get all delivery areas for a branch
router.get("/branch/:branchId", authenticateToken, getDeliveryAreasByBranch);

// Get active delivery areas for a branch
router.get("/branch/:branchId/active", authenticateToken, getActiveDeliveryAreasByBranch);

// Get delivery area by code
router.get("/code/:code", authenticateToken, getDeliveryAreaByCode);

// Update a delivery area
router.put("/:id", authenticateToken, updateDeliveryArea);

// Soft delete a delivery area
router.delete("/:id", authenticateToken, softDeleteDeliveryArea);

// Restore a soft-deleted delivery area
router.patch("/:id/restore", authenticateToken, restoreDeliveryArea);

// Hard delete a delivery area
router.delete("/:id/hard", authenticateToken, hardDeleteDeliveryArea);

module.exports = router;