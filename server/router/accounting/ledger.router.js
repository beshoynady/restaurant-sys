import express from "express";
import ledgerController from "../../controllers/accounting/ledger.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createLedgerSchema, 
  updateLedgerSchema, 
  paramsSchema, 
  querySchema 
} from "../../validation/accounting/ledger.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createLedgerSchema), ledgerController.create)
  .get(authenticateToken, validate(querySchema()), ledgerController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSchema()), ledgerController.getOne)
  .put(authenticateToken, validate(updateLedgerSchema), ledgerController.update)
  .delete(authenticateToken, validate(paramsSchema()), ledgerController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSchema()), ledgerController.restore)
;

export default router;
