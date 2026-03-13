import express from "express";
const router = express.Router();
import {
  createPreparationSection,
  updatePreparationSection,
  getAllPreparationSections,
  getActivePreparationSections,
  getPreparationSectionById,
  deletePreparationSection,
  togglePreparationSectionStatus,
} from "../../controllers/kitchen/preparation-section.controller.js";

import { authenticateToken } from "../../middlewares/authenticate.js";


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

export default router;
