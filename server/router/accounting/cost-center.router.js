import express from "express";
import costCenterController from "../../controllers/accounting/cost-center.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createCostCenterSchema, 
  updateCostCenterSchema, 
  paramsCostCenterSchema, 
  paramsCostCenterIdsSchema,
  queryCostCenterSchema 
} from "../../validation/accounting/cost-center.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createCostCenterSchema), costCenterController.create)
  .get(authenticateToken, validate(queryCostCenterSchema), costCenterController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsCostCenterSchema), costCenterController.getOne)
  .put(authenticateToken, validate(updateCostCenterSchema), costCenterController.update)
  .delete(authenticateToken, validate(paramsCostCenterSchema), costCenterController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsCostCenterSchema), costCenterController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsCostCenterSchema), costCenterController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsCostCenterIdsSchema), costCenterController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsCostCenterIdsSchema), costCenterController.bulkSoftDelete);


export default router;
