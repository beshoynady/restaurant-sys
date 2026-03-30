import express from "express";
import cashierShiftController from "../../controllers/employees/cashier-shift.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createcashierShiftSchema, updatecashierShiftSchema } from "../../validation/employees/cashier-shift.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createcashierShiftSchema), cashierShiftController.create)
  .get(authenticateToken, cashierShiftController.getAll)
;

router.route("/:id")
  .get(authenticateToken, cashierShiftController.getOne)
  .put(authenticateToken, validate(updatecashierShiftSchema), cashierShiftController.update)
  .delete(authenticateToken, cashierShiftController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, cashierShiftController.restore)
;



export default router;
