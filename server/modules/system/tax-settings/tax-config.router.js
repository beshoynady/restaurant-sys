import express from "express";
import taxConfigController from "./tax-config.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
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
  .post(authenticateToken, validate(createTaxConfigSchema), taxConfigController.create)
  .get(authenticateToken, validate(queryTaxConfigSchema), taxConfigController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsTaxConfigSchema), taxConfigController.getOne)
  .put(authenticateToken, validate(updateTaxConfigSchema), taxConfigController.update)
  .delete(authenticateToken, validate(paramsTaxConfigSchema), taxConfigController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsTaxConfigSchema), taxConfigController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsTaxConfigSchema), taxConfigController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsTaxConfigIdsSchema), taxConfigController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsTaxConfigIdsSchema), taxConfigController.bulkSoftDelete);


export default router;
