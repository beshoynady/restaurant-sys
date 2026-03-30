import express from "express";
import loyaltyRewardController from "../../controllers/loyalty/loyalty-reward.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createloyaltyRewardSchema, updateloyaltyRewardSchema } from "../../validation/loyalty/loyalty-reward.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createloyaltyRewardSchema), loyaltyRewardController.create)
  .get(authenticateToken, loyaltyRewardController.getAll)
;

router.route("/:id")
  .get(authenticateToken, loyaltyRewardController.getOne)
  .put(authenticateToken, validate(updateloyaltyRewardSchema), loyaltyRewardController.update)
  .delete(authenticateToken, loyaltyRewardController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, loyaltyRewardController.restore)
;



export default router;
