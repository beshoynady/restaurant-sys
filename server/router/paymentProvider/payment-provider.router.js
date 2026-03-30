import express from "express";
import paymentProviderController from "../../controllers/paymentProvider/payment-provider.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createpaymentProviderSchema, updatepaymentProviderSchema } from "../../validation/paymentProvider/payment-provider.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createpaymentProviderSchema), paymentProviderController.create)
  .get(authenticateToken, paymentProviderController.getAll)
;

router.route("/:id")
  .get(authenticateToken, paymentProviderController.getOne)
  .put(authenticateToken, validate(updatepaymentProviderSchema), paymentProviderController.update)
  .delete(authenticateToken, paymentProviderController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, paymentProviderController.restore)
;



export default router;
