import express from "express";
import consumptionController from "../../controllers/inventory/consumption.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createConsumptionSchema, 
  updateConsumptionSchema, 
  paramsSchema, 
  querySchema 
} from "../../validation/inventory/consumption.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createConsumptionSchema), consumptionController.create)
  .get(authenticateToken, validate(querySchema()), consumptionController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSchema()), consumptionController.getOne)
  .put(authenticateToken, validate(updateConsumptionSchema), consumptionController.update)
  .delete(authenticateToken, validate(paramsSchema()), consumptionController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSchema()), consumptionController.restore)
;

export default router;
