import express from "express";
import offlineCustomerController from "../../controllers/customers/offline-customer.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createOfflineCustomerSchema, updateOfflineCustomerSchema, offlineCustomerParamsSchema, offlineCustomerQuerySchema } from "../../validation/customers/offline-customer.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createOfflineCustomerSchema), offlineCustomerController.create)
  .get(authenticateToken, validate(offlineCustomerQuerySchema), offlineCustomerController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(offlineCustomerParamsSchema), offlineCustomerController.getOne)
  .put(authenticateToken, validate(updateOfflineCustomerSchema), offlineCustomerController.update)
  .delete(authenticateToken, validate(offlineCustomerParamsSchema), offlineCustomerController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(offlineCustomerParamsSchema), offlineCustomerController.restore)
;

export default router;
