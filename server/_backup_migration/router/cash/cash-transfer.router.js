import express from "express";
import cashTransferController from "../../controllers/cash/cash-transfer.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createCashTransferSchema, 
  updateCashTransferSchema, 
  paramsCashTransferSchema, 
  paramsCashTransferIdsSchema,
  queryCashTransferSchema 
} from "../../validation/cash/cash-transfer.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createCashTransferSchema), cashTransferController.create)
  .get(authenticateToken, validate(queryCashTransferSchema), cashTransferController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsCashTransferSchema), cashTransferController.getOne)
  .put(authenticateToken, validate(updateCashTransferSchema), cashTransferController.update)
  .delete(authenticateToken, validate(paramsCashTransferSchema), cashTransferController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsCashTransferSchema), cashTransferController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsCashTransferSchema), cashTransferController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsCashTransferIdsSchema), cashTransferController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsCashTransferIdsSchema), cashTransferController.bulkSoftDelete);


export default router;
