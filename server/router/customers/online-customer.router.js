import express from "express";
import onlineCustomerController from "../../controllers/customers/online-customer.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createOnlineCustomerSchema, 
  updateOnlineCustomerSchema, 
  paramsSchema, 
  querySchema 
} from "../../validation/customers/online-customer.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createOnlineCustomerSchema), onlineCustomerController.create)
  .get(authenticateToken, validate(querySchema()), onlineCustomerController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSchema()), onlineCustomerController.getOne)
  .put(authenticateToken, validate(updateOnlineCustomerSchema), onlineCustomerController.update)
  .delete(authenticateToken, validate(paramsSchema()), onlineCustomerController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSchema()), onlineCustomerController.restore)
;

export default router;
