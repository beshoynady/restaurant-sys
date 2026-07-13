import express from "express";
import salesReturnSettingsController from "./sales-return-settings.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import { 
  createSalesReturnSettingsSchema, 
  updateSalesReturnSettingsSchema, 
  paramsSalesReturnSettingsSchema, 
  paramsSalesReturnSettingsIdsSchema,
  querySalesReturnSettingsSchema 
} from "./sales-return-settings.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken,
    authorize("SalesReturnSettings", "create"),
    checkModuleEnabled("sales"), validate(createSalesReturnSettingsSchema), salesReturnSettingsController.create)
  .get(authenticateToken,
    authorize("SalesReturnSettings", "read"),
    checkModuleEnabled("sales"), validate(querySalesReturnSettingsSchema), salesReturnSettingsController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken,
    authorize("SalesReturnSettings", "read"),
    checkModuleEnabled("sales"), validate(paramsSalesReturnSettingsSchema, "params"), salesReturnSettingsController.getOne)
  .put(authenticateToken,
    authorize("SalesReturnSettings", "update"),
    checkModuleEnabled("sales"), validate(updateSalesReturnSettingsSchema), salesReturnSettingsController.update)
  .delete(authenticateToken,
    authorize("SalesReturnSettings", "delete"),
    checkModuleEnabled("sales"), validate(paramsSalesReturnSettingsSchema, "params"), salesReturnSettingsController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken,
    authorize("SalesReturnSettings", "delete"),
    checkModuleEnabled("sales"), validate(paramsSalesReturnSettingsSchema, "params"), salesReturnSettingsController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken,
    authorize("SalesReturnSettings", "update"),
    checkModuleEnabled("sales"), validate(paramsSalesReturnSettingsSchema, "params"), salesReturnSettingsController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken,
    authorize("SalesReturnSettings", "delete"),
    checkModuleEnabled("sales"), validate(paramsSalesReturnSettingsIdsSchema), salesReturnSettingsController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,
    authorize("SalesReturnSettings", "delete"),
    checkModuleEnabled("sales"),validate(paramsSalesReturnSettingsIdsSchema), salesReturnSettingsController.bulkSoftDelete);


export default router;
