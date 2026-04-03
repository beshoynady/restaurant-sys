import express from "express";
import loyaltyRewardController from "../../controllers/loyalty/loyalty-reward.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createLoyaltyRewardSchema, 
  updateLoyaltyRewardSchema, 
  paramsLoyaltyRewardSchema, 
  paramsLoyaltyRewardIdsSchema,
  queryLoyaltyRewardSchema 
} from "../../validation/loyalty/loyalty-reward.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createLoyaltyRewardSchema), loyaltyRewardController.create)
  .get(authenticateToken, validate(queryLoyaltyRewardSchema), loyaltyRewardController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsLoyaltyRewardSchema), loyaltyRewardController.getOne)
  .put(authenticateToken, validate(updateLoyaltyRewardSchema), loyaltyRewardController.update)
  .delete(authenticateToken, validate(paramsLoyaltyRewardSchema), loyaltyRewardController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsLoyaltyRewardSchema), loyaltyRewardController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsLoyaltyRewardSchema), loyaltyRewardController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsLoyaltyRewardIdsSchema), loyaltyRewardController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsLoyaltyRewardIdsSchema), loyaltyRewardController.bulkSoftDelete);


export default router;
