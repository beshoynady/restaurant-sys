import express from "express";
import productionOrderController from "../../controllers/production/production-order.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createProductionOrderSchema, updateProductionOrderSchema, productionOrderParamsSchema, productionOrderQuerySchema } from "../../validation/production/production-order.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createProductionOrderSchema), productionOrderController.create)
  .get(authenticateToken, validate(productionOrderQuerySchema), productionOrderController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(productionOrderParamsSchema), productionOrderController.getOne)
  .put(authenticateToken, validate(updateProductionOrderSchema), productionOrderController.update)
  .delete(authenticateToken, validate(productionOrderParamsSchema), productionOrderController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(productionOrderParamsSchema), productionOrderController.restore)
;

export default router;
