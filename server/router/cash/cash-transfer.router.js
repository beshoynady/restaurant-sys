import express from "express";
import cashTransferController from "../../controllers/cash/cash-transfer.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createCashTransferSchema, updateCashTransferSchema, cashTransferParamsSchema, cashTransferQuerySchema } from "../../validation/cash/cash-transfer.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createCashTransferSchema), cashTransferController.create)
  .get(authenticateToken, validate(cashTransferQuerySchema), cashTransferController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(cashTransferParamsSchema), cashTransferController.getOne)
  .put(authenticateToken, validate(updateCashTransferSchema), cashTransferController.update)
  .delete(authenticateToken, validate(cashTransferParamsSchema), cashTransferController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(cashTransferParamsSchema), cashTransferController.restore)
;

export default router;
