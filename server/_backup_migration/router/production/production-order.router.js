import express from "express";
import productionOrderController from "../../controllers/production/production-order.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createProductionOrderSchema, 
  updateProductionOrderSchema, 
  paramsProductionOrderSchema, 
  paramsProductionOrderIdsSchema,
  queryProductionOrderSchema 
} from "../../validation/production/production-order.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createProductionOrderSchema), productionOrderController.create)
  .get(authenticateToken, validate(queryProductionOrderSchema), productionOrderController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsProductionOrderSchema), productionOrderController.getOne)
  .put(authenticateToken, validate(updateProductionOrderSchema), productionOrderController.update)
  .delete(authenticateToken, validate(paramsProductionOrderSchema), productionOrderController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsProductionOrderSchema), productionOrderController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsProductionOrderSchema), productionOrderController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsProductionOrderIdsSchema), productionOrderController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsProductionOrderIdsSchema), productionOrderController.bulkSoftDelete);


export default router;
