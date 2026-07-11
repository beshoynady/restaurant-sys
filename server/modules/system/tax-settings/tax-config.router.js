import express from "express";
import taxConfigController from "./tax-config.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import validate from "../../../middlewares/validate.js";
import { 
  createTaxConfigSchema, 
  updateTaxConfigSchema, 
  paramsTaxConfigSchema, 
  paramsTaxConfigIdsSchema,
  queryTaxConfigSchema 
} from "./tax-config.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken,
    authorize("TaxConfigs", "create"), validate(createTaxConfigSchema), taxConfigController.create)
  .get(authenticateToken,
    authorize("TaxConfigs", "read"), validate(queryTaxConfigSchema), taxConfigController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken,
    authorize("TaxConfigs", "read"), validate(paramsTaxConfigSchema), taxConfigController.getOne)
  .put(authenticateToken,
    authorize("TaxConfigs", "update"), validate(updateTaxConfigSchema), taxConfigController.update)
  .delete(authenticateToken,
    authorize("TaxConfigs", "delete"), validate(paramsTaxConfigSchema), taxConfigController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken,
    authorize("TaxConfigs", "delete"), validate(paramsTaxConfigSchema), taxConfigController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken,
    authorize("TaxConfigs", "update"), validate(paramsTaxConfigSchema), taxConfigController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken,
    authorize("TaxConfigs", "delete"), validate(paramsTaxConfigIdsSchema), taxConfigController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,
    authorize("TaxConfigs", "delete"),validate(paramsTaxConfigIdsSchema), taxConfigController.bulkSoftDelete);


export default router;
