import express from "express";
import orderController from "../../controllers/sales/order.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createOrderSchema, 
  updateOrderSchema, 
  paramsOrderSchema, 
  paramsOrderIdsSchema,
  queryOrderSchema 
} from "../../validation/sales/order.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createOrderSchema), orderController.create)
  .get(authenticateToken, validate(queryOrderSchema), orderController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsOrderSchema), orderController.getOne)
  .put(authenticateToken, validate(updateOrderSchema), orderController.update)
  .delete(authenticateToken, validate(paramsOrderSchema), orderController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsOrderSchema), orderController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsOrderSchema), orderController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsOrderIdsSchema), orderController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsOrderIdsSchema), orderController.bulkSoftDelete);


export default router;
