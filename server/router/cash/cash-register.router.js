import express from "express";
import cashRegisterController from "../../controllers/cash/cash-register.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createcashRegisterSchema, updatecashRegisterSchema } from "../../validation/cash/cash-register.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createcashRegisterSchema), cashRegisterController.create)
  .get(authenticateToken, cashRegisterController.getAll)
;

router.route("/:id")
  .get(authenticateToken, cashRegisterController.getOne)
  .put(authenticateToken, validate(updatecashRegisterSchema), cashRegisterController.update)
  .delete(authenticateToken, cashRegisterController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, cashRegisterController.restore)
;



export default router;
