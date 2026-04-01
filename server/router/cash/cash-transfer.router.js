import express from "express";
import cashTransferController from "../../controllers/cash/cash-transfer.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createCashTransferSchema, 
  updateCashTransferSchema, 
  paramsSchema, 
  querySchema 
} from "../../validation/cash/cash-transfer.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createCashTransferSchema), cashTransferController.create)
  .get(authenticateToken, validate(querySchema()), cashTransferController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSchema()), cashTransferController.getOne)
  .put(authenticateToken, validate(updateCashTransferSchema), cashTransferController.update)
  .delete(authenticateToken, validate(paramsSchema()), cashTransferController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSchema()), cashTransferController.restore)
;

export default router;
