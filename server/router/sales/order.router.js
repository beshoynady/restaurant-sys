import express from "express";
import orderController from "../../controllers/sales/order.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createOrderSchema, updateOrderSchema, orderParamsSchema, orderQuerySchema } from "../../validation/sales/order.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createOrderSchema), orderController.create)
  .get(authenticateToken, validate(orderQuerySchema), orderController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(orderParamsSchema), orderController.getOne)
  .put(authenticateToken, validate(updateOrderSchema), orderController.update)
  .delete(authenticateToken, validate(orderParamsSchema), orderController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(orderParamsSchema), orderController.restore)
;

export default router;
