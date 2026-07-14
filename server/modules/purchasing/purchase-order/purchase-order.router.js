import express from "express";
import purchaseOrderController from "./purchase-order.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import {
  createPurchaseOrderSchema,
  updatePurchaseOrderSchema,
  paramsPurchaseOrderSchema,
  paramsPurchaseOrderIdsSchema,
  queryPurchaseOrderSchema,
  transitionPurchaseOrderSchema,
} from "./purchase-order.validation.js";

const router = express.Router();

router.route("/")
  .post(authenticateToken, authorize("PurchaseOrders", "create"), checkModuleEnabled("purchasing"), validate(createPurchaseOrderSchema), purchaseOrderController.create)
  .get(authenticateToken, authorize("PurchaseOrders", "read"), checkModuleEnabled("purchasing"), validate(queryPurchaseOrderSchema), purchaseOrderController.getAll)
;

router.route("/:id")
  .get(authenticateToken, authorize("PurchaseOrders", "read"), checkModuleEnabled("purchasing"), validate(paramsPurchaseOrderSchema, "params"), purchaseOrderController.getOne)
  .put(authenticateToken, authorize("PurchaseOrders", "update"), checkModuleEnabled("purchasing"), validate(updatePurchaseOrderSchema), purchaseOrderController.update)
  .delete(authenticateToken, authorize("PurchaseOrders", "delete"), checkModuleEnabled("purchasing"), validate(paramsPurchaseOrderSchema, "params"), purchaseOrderController.hardDelete)
;

// Explicit state-transition action route, per the Transition Guard Engine — not a generic PUT,
// so "approve this PO" is a distinct, auditable, RBAC-gated action from "edit this PO's fields."
router.route("/:id/transition")
  .post(authenticateToken, authorize("PurchaseOrders", "update"), checkModuleEnabled("purchasing"), validate(paramsPurchaseOrderSchema, "params"), validate(transitionPurchaseOrderSchema), purchaseOrderController.transition);

router.route("/bulk-delete")
  .delete(authenticateToken, authorize("PurchaseOrders", "delete"), checkModuleEnabled("purchasing"), validate(paramsPurchaseOrderIdsSchema), purchaseOrderController.bulkHardDelete);

export default router;
