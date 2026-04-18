import express from "express";
import inventoryCountController from "../../controllers/inventory/inventory-count.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createInventoryCountSchema, 
  updateInventoryCountSchema, 
  paramsInventoryCountSchema, 
  paramsInventoryCountIdsSchema,
  queryInventoryCountSchema 
} from "../../validation/inventory/inventory-count.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createInventoryCountSchema), inventoryCountController.create)
  .get(authenticateToken, validate(queryInventoryCountSchema), inventoryCountController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsInventoryCountSchema), inventoryCountController.getOne)
  .put(authenticateToken, validate(updateInventoryCountSchema), inventoryCountController.update)
  .delete(authenticateToken, validate(paramsInventoryCountSchema), inventoryCountController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsInventoryCountSchema), inventoryCountController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsInventoryCountSchema), inventoryCountController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsInventoryCountIdsSchema), inventoryCountController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsInventoryCountIdsSchema), inventoryCountController.bulkSoftDelete);


export default router;
