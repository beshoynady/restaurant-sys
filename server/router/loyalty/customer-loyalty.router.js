import express from "express";
import customerLoyaltyController from "../../controllers/loyalty/customer-loyalty.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createcustomerLoyaltySchema, updatecustomerLoyaltySchema } from "../../validation/loyalty/customer-loyalty.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createcustomerLoyaltySchema), customerLoyaltyController.create)
  .get(authenticateToken, customerLoyaltyController.getAll)
;

router.route("/:id")
  .get(authenticateToken, customerLoyaltyController.getOne)
  .put(authenticateToken, validate(updatecustomerLoyaltySchema), customerLoyaltyController.update)
  .delete(authenticateToken, customerLoyaltyController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, customerLoyaltyController.restore)
;



export default router;
