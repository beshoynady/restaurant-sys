import express from "express";
import offlineCustomerController from "./offline-customer.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createOfflineCustomerSchema, 
  updateOfflineCustomerSchema, 
  paramsOfflineCustomerSchema, 
  paramsOfflineCustomerIdsSchema,
  queryOfflineCustomerSchema 
} from "../../validation/customers/offline-customer.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createOfflineCustomerSchema), offlineCustomerController.create)
  .get(authenticateToken, validate(queryOfflineCustomerSchema), offlineCustomerController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsOfflineCustomerSchema), offlineCustomerController.getOne)
  .put(authenticateToken, validate(updateOfflineCustomerSchema), offlineCustomerController.update)
  .delete(authenticateToken, validate(paramsOfflineCustomerSchema), offlineCustomerController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsOfflineCustomerSchema), offlineCustomerController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsOfflineCustomerSchema), offlineCustomerController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsOfflineCustomerIdsSchema), offlineCustomerController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsOfflineCustomerIdsSchema), offlineCustomerController.bulkSoftDelete);


export default router;
