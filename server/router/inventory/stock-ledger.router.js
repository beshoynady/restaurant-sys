import express from "express";
import stockLedgerController from "../../controllers/inventory/stock-ledger.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createStockLedgerSchema, updateStockLedgerSchema } from "../../validation/inventory/stock-ledger.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createStockLedgerSchema), stockLedgerController.create)
  .get(authenticateToken, stockLedgerController.getAll)
;

router.route("/:id")
  .get(authenticateToken, stockLedgerController.getOne)
  .put(authenticateToken, validate(updateStockLedgerSchema), stockLedgerController.update)
  .delete(authenticateToken, stockLedgerController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, stockLedgerController.restore)
;



export default router;
