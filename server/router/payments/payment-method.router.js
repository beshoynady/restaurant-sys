import express from "express";
import paymentMethodController from "../../controllers/payments/payment-method.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createpaymentMethodSchema, updatepaymentMethodSchema } from "../../validation/payments/payment-method.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createpaymentMethodSchema), paymentMethodController.create)
  .get(authenticateToken, paymentMethodController.getAll)
;

router.route("/:id")
  .get(authenticateToken, paymentMethodController.getOne)
  .put(authenticateToken, validate(updatepaymentMethodSchema), paymentMethodController.update)
  .delete(authenticateToken, paymentMethodController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, paymentMethodController.restore)
;



export default router;
