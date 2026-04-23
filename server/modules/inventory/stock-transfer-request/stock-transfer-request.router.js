import express from "express";
import stockTransferRequestController from "./stock-transfer-request.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createStockTransferRequestSchema, 
  updateStockTransferRequestSchema, 
  paramsStockTransferRequestSchema, 
  paramsStockTransferRequestIdsSchema,
  queryStockTransferRequestSchema 
} from "./stock-transfer-request.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createStockTransferRequestSchema), stockTransferRequestController.create)
  .get(authenticateToken, validate(queryStockTransferRequestSchema), stockTransferRequestController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsStockTransferRequestSchema), stockTransferRequestController.getOne)
  .put(authenticateToken, validate(updateStockTransferRequestSchema), stockTransferRequestController.update)
  .delete(authenticateToken, validate(paramsStockTransferRequestSchema), stockTransferRequestController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsStockTransferRequestSchema), stockTransferRequestController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsStockTransferRequestSchema), stockTransferRequestController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsStockTransferRequestIdsSchema), stockTransferRequestController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsStockTransferRequestIdsSchema), stockTransferRequestController.bulkSoftDelete);


export default router;
