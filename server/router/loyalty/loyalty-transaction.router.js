import express from "express";
import loyaltyTransactionController from "../../controllers/loyalty/loyalty-transaction.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createLoyaltyTransactionSchema, 
  updateLoyaltyTransactionSchema, 
  paramsLoyaltyTransactionSchema, 
  paramsLoyaltyTransactionIdsSchema,
  queryLoyaltyTransactionSchema 
} from "../../validation/loyalty/loyalty-transaction.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createLoyaltyTransactionSchema), loyaltyTransactionController.create)
  .get(authenticateToken, validate(queryLoyaltyTransactionSchema), loyaltyTransactionController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsLoyaltyTransactionSchema), loyaltyTransactionController.getOne)
  .put(authenticateToken, validate(updateLoyaltyTransactionSchema), loyaltyTransactionController.update)
  .delete(authenticateToken, validate(paramsLoyaltyTransactionSchema), loyaltyTransactionController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsLoyaltyTransactionSchema), loyaltyTransactionController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsLoyaltyTransactionSchema), loyaltyTransactionController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsLoyaltyTransactionIdsSchema), loyaltyTransactionController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsLoyaltyTransactionIdsSchema), loyaltyTransactionController.bulkSoftDelete);


export default router;
