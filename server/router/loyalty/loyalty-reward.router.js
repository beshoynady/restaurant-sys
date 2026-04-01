import express from "express";
import loyaltyRewardController from "../../controllers/loyalty/loyalty-reward.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createLoyaltyRewardSchema, 
  updateLoyaltyRewardSchema, 
  paramsSchema, 
  querySchema 
} from "../../validation/loyalty/loyalty-reward.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createLoyaltyRewardSchema), loyaltyRewardController.create)
  .get(authenticateToken, validate(querySchema()), loyaltyRewardController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSchema()), loyaltyRewardController.getOne)
  .put(authenticateToken, validate(updateLoyaltyRewardSchema), loyaltyRewardController.update)
  .delete(authenticateToken, validate(paramsSchema()), loyaltyRewardController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSchema()), loyaltyRewardController.restore)
;

export default router;
