import express from "express";
import customerLoyaltyController from "../../controllers/loyalty/customer-loyalty.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createCustomerLoyaltySchema, updateCustomerLoyaltySchema } from "../../validation/loyalty/customer-loyalty.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createCustomerLoyaltySchema), customerLoyaltyController.create)
  .get(authenticateToken, customerLoyaltyController.getAll)
;

router.route("/:id")
  .get(authenticateToken, customerLoyaltyController.getOne)
  .put(authenticateToken, validate(updateCustomerLoyaltySchema), customerLoyaltyController.update)
  .delete(authenticateToken, customerLoyaltyController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, customerLoyaltyController.restore)
;



export default router;
