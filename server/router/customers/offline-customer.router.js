import express from "express";
import offlineCustomerController from "../../controllers/customers/offline-customer.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createOfflineCustomerSchema, 
  updateOfflineCustomerSchema, 
  paramsSchema, 
  querySchema 
} from "../../validation/customers/offline-customer.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createOfflineCustomerSchema), offlineCustomerController.create)
  .get(authenticateToken, validate(querySchema()), offlineCustomerController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSchema()), offlineCustomerController.getOne)
  .put(authenticateToken, validate(updateOfflineCustomerSchema), offlineCustomerController.update)
  .delete(authenticateToken, validate(paramsSchema()), offlineCustomerController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSchema()), offlineCustomerController.restore)
;

export default router;
