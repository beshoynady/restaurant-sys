import express from "express";
import stockItemController from "../../controllers/inventory/stock-item.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createStockItemSchema, 
  updateStockItemSchema, 
  paramsStockItemSchema, 
  paramsStockItemIdsSchema,
  queryStockItemSchema 
} from "../../validation/inventory/stock-item.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createStockItemSchema), stockItemController.create)
  .get(authenticateToken, validate(queryStockItemSchema), stockItemController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsStockItemSchema), stockItemController.getOne)
  .put(authenticateToken, validate(updateStockItemSchema), stockItemController.update)
  .delete(authenticateToken, validate(paramsStockItemSchema), stockItemController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsStockItemSchema), stockItemController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsStockItemSchema), stockItemController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsStockItemIdsSchema), stockItemController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsStockItemIdsSchema), stockItemController.bulkSoftDelete);


export default router;
