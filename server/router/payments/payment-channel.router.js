import express from "express";
import paymentChannelController from "../../controllers/payments/payment-channel.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createpaymentChannelSchema, updatepaymentChannelSchema } from "../../validation/payments/payment-channel.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createpaymentChannelSchema), paymentChannelController.create)
  .get(authenticateToken, paymentChannelController.getAll)
;

router.route("/:id")
  .get(authenticateToken, paymentChannelController.getOne)
  .put(authenticateToken, validate(updatepaymentChannelSchema), paymentChannelController.update)
  .delete(authenticateToken, paymentChannelController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, paymentChannelController.restore)
;



export default router;
