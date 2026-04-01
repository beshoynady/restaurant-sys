import express from "express";
import costCenterController from "../../controllers/accounting/cost-center.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createCostCenterSchema, 
  updateCostCenterSchema, 
  paramsSchema, 
  querySchema 
} from "../../validation/accounting/cost-center.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createCostCenterSchema), costCenterController.create)
  .get(authenticateToken, validate(querySchema()), costCenterController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSchema()), costCenterController.getOne)
  .put(authenticateToken, validate(updateCostCenterSchema), costCenterController.update)
  .delete(authenticateToken, validate(paramsSchema()), costCenterController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSchema()), costCenterController.restore)
;

export default router;
