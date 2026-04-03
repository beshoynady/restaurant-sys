import express from "express";
import onlineCustomerController from "../../controllers/customers/online-customer.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createOnlineCustomerSchema, 
  updateOnlineCustomerSchema, 
  paramsOnlineCustomerSchema, 
  paramsOnlineCustomerIdsSchema,
  queryOnlineCustomerSchema 
} from "../../validation/customers/online-customer.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createOnlineCustomerSchema), onlineCustomerController.create)
  .get(authenticateToken, validate(queryOnlineCustomerSchema), onlineCustomerController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsOnlineCustomerSchema), onlineCustomerController.getOne)
  .put(authenticateToken, validate(updateOnlineCustomerSchema), onlineCustomerController.update)
  .delete(authenticateToken, validate(paramsOnlineCustomerSchema), onlineCustomerController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsOnlineCustomerSchema), onlineCustomerController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsOnlineCustomerSchema), onlineCustomerController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsOnlineCustomerIdsSchema), onlineCustomerController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsOnlineCustomerIdsSchema), onlineCustomerController.bulkSoftDelete);


export default router;
