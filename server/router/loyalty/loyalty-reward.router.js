import express from "express";
import loyaltyRewardController from "../../controllers/loyalty/loyalty-reward.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createLoyaltyRewardSchema, updateLoyaltyRewardSchema, loyaltyRewardParamsSchema, loyaltyRewardQuerySchema } from "../../validation/loyalty/loyalty-reward.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createLoyaltyRewardSchema), loyaltyRewardController.create)
  .get(authenticateToken, validate(loyaltyRewardQuerySchema), loyaltyRewardController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(loyaltyRewardParamsSchema), loyaltyRewardController.getOne)
  .put(authenticateToken, validate(updateLoyaltyRewardSchema), loyaltyRewardController.update)
  .delete(authenticateToken, validate(loyaltyRewardParamsSchema), loyaltyRewardController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(loyaltyRewardParamsSchema), loyaltyRewardController.restore)
;

export default router;
