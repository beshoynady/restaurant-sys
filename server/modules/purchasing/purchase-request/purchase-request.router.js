import express from "express";
import purchaseRequestController from "./purchase-request.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import {
  createPurchaseRequestSchema,
  updatePurchaseRequestSchema,
  paramsPurchaseRequestSchema,
  paramsPurchaseRequestIdsSchema,
  queryPurchaseRequestSchema,
  transitionPurchaseRequestSchema,
} from "./purchase-request.validation.js";

const router = express.Router();

router.route("/")
  .post(authenticateToken, authorize("PurchaseRequests", "create"), checkModuleEnabled("purchasing"), validate(createPurchaseRequestSchema), purchaseRequestController.create)
  .get(authenticateToken, authorize("PurchaseRequests", "read"), checkModuleEnabled("purchasing"), validate(queryPurchaseRequestSchema), purchaseRequestController.getAll)
;

router.route("/:id")
  .get(authenticateToken, authorize("PurchaseRequests", "read"), checkModuleEnabled("purchasing"), validate(paramsPurchaseRequestSchema, "params"), purchaseRequestController.getOne)
  .put(authenticateToken, authorize("PurchaseRequests", "update"), checkModuleEnabled("purchasing"), validate(updatePurchaseRequestSchema), purchaseRequestController.update)
  .delete(authenticateToken, authorize("PurchaseRequests", "delete"), checkModuleEnabled("purchasing"), validate(paramsPurchaseRequestSchema, "params"), purchaseRequestController.hardDelete)
;

router.route("/:id/transition")
  .post(authenticateToken, authorize("PurchaseRequests", "update"), checkModuleEnabled("purchasing"), validate(paramsPurchaseRequestSchema, "params"), validate(transitionPurchaseRequestSchema), purchaseRequestController.transition);

router.route("/bulk-delete")
  .delete(authenticateToken, authorize("PurchaseRequests", "delete"), checkModuleEnabled("purchasing"), validate(paramsPurchaseRequestIdsSchema), purchaseRequestController.bulkHardDelete);

export default router;
