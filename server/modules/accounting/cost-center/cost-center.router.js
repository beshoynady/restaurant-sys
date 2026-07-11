import express from "express";
import costCenterController from "./cost-center.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import { 
  createCostCenterSchema, 
  updateCostCenterSchema, 
  paramsCostCenterSchema, 
  paramsCostCenterIdsSchema,
  queryCostCenterSchema 
} from "./cost-center.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken,
    authorize("CostCenters", "create"),
    checkModuleEnabled("accounting"), validate(createCostCenterSchema), costCenterController.create)
  .get(authenticateToken,
    authorize("CostCenters", "read"),
    checkModuleEnabled("accounting"), validate(queryCostCenterSchema), costCenterController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken,
    authorize("CostCenters", "read"),
    checkModuleEnabled("accounting"), validate(paramsCostCenterSchema), costCenterController.getOne)
  .put(authenticateToken,
    authorize("CostCenters", "update"),
    checkModuleEnabled("accounting"), validate(updateCostCenterSchema), costCenterController.update)
  .delete(authenticateToken,
    authorize("CostCenters", "delete"),
    checkModuleEnabled("accounting"), validate(paramsCostCenterSchema), costCenterController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken,
    authorize("CostCenters", "delete"),
    checkModuleEnabled("accounting"), validate(paramsCostCenterSchema), costCenterController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken,
    authorize("CostCenters", "update"),
    checkModuleEnabled("accounting"), validate(paramsCostCenterSchema), costCenterController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken,
    authorize("CostCenters", "delete"),
    checkModuleEnabled("accounting"), validate(paramsCostCenterIdsSchema), costCenterController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,
    authorize("CostCenters", "delete"),
    checkModuleEnabled("accounting"),validate(paramsCostCenterIdsSchema), costCenterController.bulkSoftDelete);


export default router;
