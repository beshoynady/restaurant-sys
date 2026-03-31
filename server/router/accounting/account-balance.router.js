import express from "express";
import accountBalanceController from "../../controllers/accounting/account-balance.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createAccountBalanceSchema, updateAccountBalanceSchema } from "../../validation/accounting/account-balance.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createAccountBalanceSchema), accountBalanceController.create)
  .get(authenticateToken, accountBalanceController.getAll)
;

router.route("/:id")
  .get(authenticateToken, accountBalanceController.getOne)
  .put(authenticateToken, validate(updateAccountBalanceSchema), accountBalanceController.update)
  .delete(authenticateToken, accountBalanceController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, accountBalanceController.restore)
;



export default router;
