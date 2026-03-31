import express from "express";
import shiftController from "../../controllers/employees/shift.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createShiftSchema, updateShiftSchema } from "../../validation/employees/shift.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createShiftSchema), shiftController.create)
  .get(authenticateToken, shiftController.getAll)
;

router.route("/:id")
  .get(authenticateToken, shiftController.getOne)
  .put(authenticateToken, validate(updateShiftSchema), shiftController.update)
  .delete(authenticateToken, shiftController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, shiftController.restore)
;



export default router;
