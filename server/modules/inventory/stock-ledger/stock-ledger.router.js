import express from "express";
import stockLedgerController from "./stock-ledger.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import validate from "../../../middlewares/validate.js";
import { 
  createStockLedgerSchema, 
  updateStockLedgerSchema, 
  paramsStockLedgerSchema, 
  paramsStockLedgerIdsSchema,
  queryStockLedgerSchema 
} from "./stock-ledger.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createStockLedgerSchema), stockLedgerController.create)
  .get(authenticateToken, validate(queryStockLedgerSchema), stockLedgerController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsStockLedgerSchema), stockLedgerController.getOne)
  .put(authenticateToken, validate(updateStockLedgerSchema), stockLedgerController.update)
  .delete(authenticateToken, validate(paramsStockLedgerSchema), stockLedgerController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsStockLedgerSchema), stockLedgerController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsStockLedgerSchema), stockLedgerController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsStockLedgerIdsSchema), stockLedgerController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsStockLedgerIdsSchema), stockLedgerController.bulkSoftDelete);


export default router;
