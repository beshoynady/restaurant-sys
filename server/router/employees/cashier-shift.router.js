import express from "express";
import cashierShiftController from "../../controllers/employees/cashier-shift.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createCashierShiftSchema, updateCashierShiftSchema } from "../../validation/employees/cashier-shift.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createCashierShiftSchema), cashierShiftController.create)
  .get(authenticateToken, cashierShiftController.getAll)
;

router.route("/:id")
  .get(authenticateToken, cashierShiftController.getOne)
  .put(authenticateToken, validate(updateCashierShiftSchema), cashierShiftController.update)
  .delete(authenticateToken, cashierShiftController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, cashierShiftController.restore)
;



export default router;
