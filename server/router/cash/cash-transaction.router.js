import express from "express";
import cashTransactionController from "../../controllers/cash/cash-transaction.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createcashTransactionSchema, updatecashTransactionSchema } from "../../validation/cash/cash-transaction.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createcashTransactionSchema), cashTransactionController.create)
  .get(authenticateToken, cashTransactionController.getAll)
;

router.route("/:id")
  .get(authenticateToken, cashTransactionController.getOne)
  .put(authenticateToken, validate(updatecashTransactionSchema), cashTransactionController.update)
  .delete(authenticateToken, cashTransactionController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, cashTransactionController.restore)
;



export default router;
