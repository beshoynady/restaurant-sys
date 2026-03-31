import express from "express";
import accountingPeriodController from "../../controllers/accounting/accounting-period.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createAccountingPeriodSchema, updateAccountingPeriodSchema } from "../../validation/accounting/accounting-period.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createAccountingPeriodSchema), accountingPeriodController.create)
  .get(authenticateToken, accountingPeriodController.getAll)
;

router.route("/:id")
  .get(authenticateToken, accountingPeriodController.getOne)
  .put(authenticateToken, validate(updateAccountingPeriodSchema), accountingPeriodController.update)
  .delete(authenticateToken, accountingPeriodController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, accountingPeriodController.restore)
;



export default router;
