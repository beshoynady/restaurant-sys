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
} = require("../../controllers/preparationSectionController");

const { authenticateToken } = require("../../middlewares/authenticate");


/**
 * Routes for Preparation Sections
 */

// Get all sections (with optional filters)
router
  .route("/")
  .post(authenticateToken,createPreparationSection)
  .get(authenticateToken,getAllPreparationSections);

// Get all active sections for POS/KDS
router
  .route("/active")
  .get(authenticateToken,getActivePreparationSections);


// Routes for specific section by ID
router
  .route("/:id")
  // authMiddleware,
  .get(authenticateToken,getPreparationSectionById) // Get section by ID
  .put(authenticateToken,updatePreparationSection) // Update section
  .delete(authenticateToken,deletePreparationSection); // Soft delete (deactivate)

// Toggle active status of a section
router
  .route("/:id/toggle-status")
  // authMiddleware,
  .patch(authenticateToken,togglePreparationSectionStatus);

module.exports = router;
