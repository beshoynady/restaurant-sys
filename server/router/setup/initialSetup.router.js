import express from "express";
import initialSetupController from "../../controllers/setup/initialSetup.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, initialSetupController)
  .get(authenticateToken, initialSetupController)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, initialSetupController)
  .put(authenticateToken, initialSetupController)
  .delete(authenticateToken, initialSetupController) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, initialSetupController)
;

export default router;
