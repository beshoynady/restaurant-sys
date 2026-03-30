import express from "express";
import loyaltyTransactionController from "../../controllers/loyalty/loyalty-transaction.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createloyaltyTransactionSchema, updateloyaltyTransactionSchema } from "../../validation/loyalty/loyalty-transaction.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createloyaltyTransactionSchema), loyaltyTransactionController.create)
  .get(authenticateToken, loyaltyTransactionController.getAll)
;

router.route("/:id")
  .get(authenticateToken, loyaltyTransactionController.getOne)
  .put(authenticateToken, validate(updateloyaltyTransactionSchema), loyaltyTransactionController.update)
  .delete(authenticateToken, loyaltyTransactionController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, loyaltyTransactionController.restore)
;



export default router;
