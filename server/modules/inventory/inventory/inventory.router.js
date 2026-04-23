import express from "express";
import inventoryController from "./inventory.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createInventorySchema, 
  updateInventorySchema, 
  paramsInventorySchema, 
  paramsInventoryIdsSchema,
  queryInventorySchema 
} from "./inventory.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createInventorySchema), inventoryController.create)
  .get(authenticateToken, validate(queryInventorySchema), inventoryController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsInventorySchema), inventoryController.getOne)
  .put(authenticateToken, validate(updateInventorySchema), inventoryController.update)
  .delete(authenticateToken, validate(paramsInventorySchema), inventoryController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsInventorySchema), inventoryController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsInventorySchema), inventoryController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsInventoryIdsSchema), inventoryController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsInventoryIdsSchema), inventoryController.bulkSoftDelete);


export default router;
