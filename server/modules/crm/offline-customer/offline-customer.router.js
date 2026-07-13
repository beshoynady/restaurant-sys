import express from "express";
import offlineCustomerController from "./offline-customer.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import { 
  createOfflineCustomerSchema, 
  updateOfflineCustomerSchema, 
  paramsOfflineCustomerSchema, 
  paramsOfflineCustomerIdsSchema,
  queryOfflineCustomerSchema 
} from "./offline-customer.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken,
    authorize("OfflineCustomers", "create"),
    checkModuleEnabled("crm"), validate(createOfflineCustomerSchema), offlineCustomerController.create)
  .get(authenticateToken,
    authorize("OfflineCustomers", "read"),
    checkModuleEnabled("crm"), validate(queryOfflineCustomerSchema), offlineCustomerController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken,
    authorize("OfflineCustomers", "read"),
    checkModuleEnabled("crm"), validate(paramsOfflineCustomerSchema, "params"), offlineCustomerController.getOne)
  .put(authenticateToken,
    authorize("OfflineCustomers", "update"),
    checkModuleEnabled("crm"), validate(updateOfflineCustomerSchema), offlineCustomerController.update)
  .delete(authenticateToken,
    authorize("OfflineCustomers", "delete"),
    checkModuleEnabled("crm"), validate(paramsOfflineCustomerSchema, "params"), offlineCustomerController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken,
    authorize("OfflineCustomers", "delete"),
    checkModuleEnabled("crm"), validate(paramsOfflineCustomerSchema, "params"), offlineCustomerController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken,
    authorize("OfflineCustomers", "update"),
    checkModuleEnabled("crm"), validate(paramsOfflineCustomerSchema, "params"), offlineCustomerController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken,
    authorize("OfflineCustomers", "delete"),
    checkModuleEnabled("crm"), validate(paramsOfflineCustomerIdsSchema), offlineCustomerController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,
    authorize("OfflineCustomers", "delete"),
    checkModuleEnabled("crm"),validate(paramsOfflineCustomerIdsSchema), offlineCustomerController.bulkSoftDelete);


export default router;
