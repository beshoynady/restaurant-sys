import express from "express";
import customerAuthController from "./customer-auth.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createCustomerAuthSchema, 
  updateCustomerAuthSchema, 
  paramsCustomerAuthSchema, 
  paramsCustomerAuthIdsSchema,
  queryCustomerAuthSchema 
} from "../../validation/customers/customer-auth.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createCustomerAuthSchema), customerAuthController.create)
  .get(authenticateToken, validate(queryCustomerAuthSchema), customerAuthController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsCustomerAuthSchema), customerAuthController.getOne)
  .put(authenticateToken, validate(updateCustomerAuthSchema), customerAuthController.update)
  .delete(authenticateToken, validate(paramsCustomerAuthSchema), customerAuthController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsCustomerAuthSchema), customerAuthController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsCustomerAuthSchema), customerAuthController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsCustomerAuthIdsSchema), customerAuthController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsCustomerAuthIdsSchema), customerAuthController.bulkSoftDelete);


export default router;
