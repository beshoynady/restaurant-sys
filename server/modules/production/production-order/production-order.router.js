import express from "express";
import productionOrderController from "./production-order.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import {
  createProductionOrderSchema,
  updateProductionOrderSchema,
  paramsProductionOrderSchema,
  paramsProductionOrderIdsSchema,
  queryProductionOrderSchema,
  transitionProductionOrderSchema,
  completeProductionOrderSchema,
} from "./production-order.validation.js";

// Enterprise Production Platform: this router was previously an empty stub (no routes defined at
// all). Rebuilt on the standard chain.
const router = express.Router();

router.route("/")
  .post(authenticateToken,
    authorize("ProductionOrders", "create"),
    checkModuleEnabled("production"), validate(createProductionOrderSchema), productionOrderController.create)
  .get(authenticateToken,
    authorize("ProductionOrders", "read"),
    checkModuleEnabled("production"), validate(queryProductionOrderSchema), productionOrderController.getAll)
;

router.route("/:id")
  .get(authenticateToken,
    authorize("ProductionOrders", "read"),
    checkModuleEnabled("production"), validate(paramsProductionOrderSchema, "params"), productionOrderController.getOne)
  .put(authenticateToken,
    authorize("ProductionOrders", "update"),
    checkModuleEnabled("production"), validate(updateProductionOrderSchema), productionOrderController.update)
  .delete(authenticateToken,
    authorize("ProductionOrders", "delete"),
    checkModuleEnabled("production"), validate(paramsProductionOrderSchema, "params"), productionOrderController.hardDelete)
;

router.route("/:id/transition")
  .post(authenticateToken,
    authorize("ProductionOrders", "update"),
    checkModuleEnabled("production"), validate(paramsProductionOrderSchema, "params"), validate(transitionProductionOrderSchema), productionOrderController.transition);

router.route("/:id/complete")
  .post(authenticateToken,
    authorize("ProductionOrders", "update"),
    checkModuleEnabled("production"), validate(paramsProductionOrderSchema, "params"), validate(completeProductionOrderSchema), productionOrderController.complete);

router.route("/bulk-delete")
  .delete(authenticateToken,
  authorize("ProductionOrders", "delete"),
  checkModuleEnabled("production"), validate(paramsProductionOrderIdsSchema), productionOrderController.bulkHardDelete);

export default router;
