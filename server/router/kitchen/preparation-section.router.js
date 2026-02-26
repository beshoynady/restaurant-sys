const express = require("express");
const router = express.Router();
const {
  createPreparationSection,
  updatePreparationSection,
  getAllPreparationSections,
  getActivePreparationSections,
  getPreparationSectionById,
  deletePreparationSection,
  togglePreparationSectionStatus,
} = require("../controllers/preparationSectionController");

const { authenticateToken } = require("../../middlewares/authenticate");
const checkSubscription = require("../../middlewares/checkSubscription");

/**
 * Routes for Preparation Sections
 */

// Get all sections (with optional filters)
router
  .route("/")
  .post(authenticateToken, checkSubscription, createPreparationSection)
  .get(authenticateToken, checkSubscription, getAllPreparationSections);

// Get all active sections for POS/KDS
router
  .route("/active")
  .get(authenticateToken, checkSubscription, getActivePreparationSections);


// Routes for specific section by ID
router
  .route("/:id")
  // authMiddleware,
  .get(authenticateToken, checkSubscription, getPreparationSectionById) // Get section by ID
  .put(authenticateToken, checkSubscription, updatePreparationSection) // Update section
  .delete(authenticateToken, checkSubscription, deletePreparationSection); // Soft delete (deactivate)

// Toggle active status of a section
router
  .route("/:id/toggle-status")
  // authMiddleware,
  .patch(authenticateToken, checkSubscription, togglePreparationSectionStatus);

module.exports = router;
