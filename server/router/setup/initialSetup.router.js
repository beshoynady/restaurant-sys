import express from "express";
import initialSetupController from "../../controllers/setup/initialSetup.controller.js";

const router = express.Router();

// @route   POST /api/setup/initial-setup
// @desc    Perform initial setup for a new brand
// @access  Public (since it's the initial setup, no auth required)
router.post("/initial-setup", initialSetupController);

export default router;