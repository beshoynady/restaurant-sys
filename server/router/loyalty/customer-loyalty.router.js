import express from "express";
import customerLoyaltyController from "../../controllers/loyalty/customer-loyalty.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createCustomerLoyaltySchema, 
  updateCustomerLoyaltySchema, 
  paramsCustomerLoyaltySchema, 
  paramsCustomerLoyaltyIdsSchema,
  queryCustomerLoyaltySchema 
} from "../../validation/loyalty/customer-loyalty.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createCustomerLoyaltySchema), customerLoyaltyController.create)
  .get(authenticateToken, validate(queryCustomerLoyaltySchema), customerLoyaltyController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsCustomerLoyaltySchema), customerLoyaltyController.getOne)
  .put(authenticateToken, validate(updateCustomerLoyaltySchema), customerLoyaltyController.update)
  .delete(authenticateToken, validate(paramsCustomerLoyaltySchema), customerLoyaltyController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsCustomerLoyaltySchema), customerLoyaltyController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsCustomerLoyaltySchema), customerLoyaltyController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsCustomerLoyaltyIdsSchema), customerLoyaltyController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsCustomerLoyaltyIdsSchema), customerLoyaltyController.bulkSoftDelete);


export default router;
