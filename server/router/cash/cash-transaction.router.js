import express from "express";
import cashTransactionController from "../../controllers/cash/cash-transaction.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createCashTransactionSchema, updateCashTransactionSchema } from "../../validation/cash/cash-transaction.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createCashTransactionSchema), cashTransactionController.create)
  .get(authenticateToken, cashTransactionController.getAll)
;

router.route("/:id")
  .get(authenticateToken, cashTransactionController.getOne)
  .put(authenticateToken, validate(updateCashTransactionSchema), cashTransactionController.update)
  .delete(authenticateToken, cashTransactionController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, cashTransactionController.restore)
;



export default router;
