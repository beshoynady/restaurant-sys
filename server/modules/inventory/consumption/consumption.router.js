import express from "express";
import consumptionController from "./consumption.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import {
  createConsumptionSchema,
  updateConsumptionSchema,
  paramsConsumptionSchema,
  paramsConsumptionIdsSchema,
  queryConsumptionSchema
} from "./consumption.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken,
    authorize("Consumptions", "create"),
    checkModuleEnabled("inventory"), validate(createConsumptionSchema), consumptionController.create)
  .get(authenticateToken,
    authorize("Consumptions", "read"),
    checkModuleEnabled("inventory"), validate(queryConsumptionSchema), consumptionController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken,
    authorize("Consumptions", "read"),
    checkModuleEnabled("inventory"), validate(paramsConsumptionSchema, "params"), consumptionController.getOne)
  .put(authenticateToken,
    authorize("Consumptions", "update"),
    checkModuleEnabled("inventory"), validate(updateConsumptionSchema), consumptionController.update)
  .delete(authenticateToken,
    authorize("Consumptions", "delete"),
    checkModuleEnabled("inventory"), validate(paramsConsumptionSchema, "params"), consumptionController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken,
    authorize("Consumptions", "delete"),
    checkModuleEnabled("inventory"), validate(paramsConsumptionSchema, "params"), consumptionController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken,
    authorize("Consumptions", "update"),
    checkModuleEnabled("inventory"), validate(paramsConsumptionSchema, "params"), consumptionController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken,
    authorize("Consumptions", "delete"),
    checkModuleEnabled("inventory"), validate(paramsConsumptionIdsSchema), consumptionController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,
    authorize("Consumptions", "delete"),
    checkModuleEnabled("inventory"),validate(paramsConsumptionIdsSchema), consumptionController.bulkSoftDelete);


export default router;
