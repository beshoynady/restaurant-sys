import express from "express";
import salesReturnSettingsController from "./sales-return-settings.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
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
  .post(authenticateToken, validate(createSalesReturnSettingsSchema), salesReturnSettingsController.create)
  .get(authenticateToken, validate(querySalesReturnSettingsSchema), salesReturnSettingsController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSalesReturnSettingsSchema), salesReturnSettingsController.getOne)
  .put(authenticateToken, validate(updateSalesReturnSettingsSchema), salesReturnSettingsController.update)
  .delete(authenticateToken, validate(paramsSalesReturnSettingsSchema), salesReturnSettingsController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsSalesReturnSettingsSchema), salesReturnSettingsController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSalesReturnSettingsSchema), salesReturnSettingsController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsSalesReturnSettingsIdsSchema), salesReturnSettingsController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsSalesReturnSettingsIdsSchema), salesReturnSettingsController.bulkSoftDelete);


export default router;
