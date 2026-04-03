import express from "express";
import consumptionController from "../../controllers/inventory/consumption.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createConsumptionSchema, 
  updateConsumptionSchema, 
  paramsConsumptionSchema, 
  paramsConsumptionIdsSchema,
  queryConsumptionSchema 
} from "../../validation/inventory/consumption.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createConsumptionSchema), consumptionController.create)
  .get(authenticateToken, validate(queryConsumptionSchema), consumptionController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsConsumptionSchema), consumptionController.getOne)
  .put(authenticateToken, validate(updateConsumptionSchema), consumptionController.update)
  .delete(authenticateToken, validate(paramsConsumptionSchema), consumptionController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsConsumptionSchema), consumptionController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsConsumptionSchema), consumptionController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsConsumptionIdsSchema), consumptionController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsConsumptionIdsSchema), consumptionController.bulkSoftDelete);


export default router;
