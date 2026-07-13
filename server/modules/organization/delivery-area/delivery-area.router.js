import express from "express";
import deliveryAreaController from "./delivery-area.controller.js";
import deliveryAreaService from "./delivery-area.service.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import checkModuleEnabledForBranch from "../../../middlewares/checkModuleEnabledForBranch.js";
import validate from "../../../middlewares/validate.js";

import {
  createDeliveryAreaSchema,
  updateDeliveryAreaSchema,
  paramsDeliveryAreaSchema,
  paramsDeliveryAreaIdsSchema,
  queryDeliveryAreaSchema,
  resolveAreaQuerySchema,
} from "./delivery-area.validation.js";

const router = express.Router();

const deliveryAreaConfig = (req, _res, next) => {
  req.populate = ["brand", "branch", "createdBy", "updatedBy"];
  req.uniqueFields = ["code"];
  req.fieldsWithLang = ["name"];
  next();
};

// =====================================================
// PUBLIC (Customer / Checkout)
// =====================================================
// SECURITY: these routes have no authenticateToken by design (anonymous
// customers). Every one of them requires :branchId in the URL — the
// service resolves :brand from it server-side — instead of an "areaId
// alone" shape, which would let any caller enumerate ObjectIds and read
// another brand's delivery area/pricing data. Kept under the shared
// "/branch/:branchId/..." prefix so it can never collide with the
// "/:id" admin single-resource routes below.
//
// FEATURE TOGGLE (Organization Final Audit, H-1): these public routes
// previously had no checkModuleEnabled at all — the original middleware
// can't run without req.user, which doesn't exist here. A brand that
// disabled its "delivery" module could still have every one of these
// endpoints fully functional for customers. checkModuleEnabledForBranch
// resolves brand from :branchId the same way the routes' own service
// already does, never from client input.
const resolveBrandFromBranchParam = (req) =>
  deliveryAreaService.resolveBrandForBranch(req.params.branchId);

router.get(
  "/branch/:branchId/active",
  checkModuleEnabledForBranch("delivery", resolveBrandFromBranchParam),
  deliveryAreaController.getActiveAreasByBranch,
);
// Point-in-polygon resolver ("which area covers this lat/lng") — mounted
// alongside /active at the same 2-segment depth, before any 3-segment
// "/:areaId/..." route, so "resolve" is never mistaken for an areaId.
router.get(
  "/branch/:branchId/resolve",
  checkModuleEnabledForBranch("delivery", resolveBrandFromBranchParam),
  validate(resolveAreaQuerySchema, "query"),
  deliveryAreaController.resolveAreaForPoint,
);
router.get(
  "/branch/:branchId/:areaId/summary",
  checkModuleEnabledForBranch("delivery", resolveBrandFromBranchParam),
  deliveryAreaController.getDeliverySummary,
);
router.get(
  "/branch/:branchId/:areaId/calculate",
  checkModuleEnabledForBranch("delivery", resolveBrandFromBranchParam),
  deliveryAreaController.calculateDeliveryFee,
);
router.post(
  "/branch/:branchId/:areaId/validate",
  checkModuleEnabledForBranch("delivery", resolveBrandFromBranchParam),
  deliveryAreaController.validateOrder,
);

// =====================================================
// ADMIN
// =====================================================

router
  .route("/")
  .post(
    authenticateToken,
    authorize("DeliveryAreas", "create"),
    checkModuleEnabled("delivery"),
    deliveryAreaConfig,
    validate(createDeliveryAreaSchema),
    deliveryAreaController.create,
  )
  .get(
    authenticateToken,
    authorize("DeliveryAreas", "read"),
    checkModuleEnabled("delivery"),
    deliveryAreaConfig,
    validate(queryDeliveryAreaSchema),
    deliveryAreaController.getAll,
  );

router
  .route("/:id")
  .get(
    authenticateToken,
    authorize("DeliveryAreas", "read"),
    checkModuleEnabled("delivery"),
    deliveryAreaConfig,
    validate(paramsDeliveryAreaSchema, "params"),
    deliveryAreaController.getOne,
  )
  .put(
    authenticateToken,
    authorize("DeliveryAreas", "update"),
    checkModuleEnabled("delivery"),
    deliveryAreaConfig,
    validate(updateDeliveryAreaSchema),
    deliveryAreaController.update,
  )
  .delete(
    authenticateToken,
    authorize("DeliveryAreas", "delete"),
    checkModuleEnabled("delivery"),
    validate(paramsDeliveryAreaSchema, "params"),
    deliveryAreaController.hardDelete,
  );

// Soft delete
router.patch(
  "/soft-delete/:id",
  authenticateToken,
  authorize("DeliveryAreas", "delete"),
  checkModuleEnabled("delivery"),
  validate(paramsDeliveryAreaSchema, "params"),
  deliveryAreaController.softDelete,
);

// Restore
router.patch(
  "/restore/:id",
  authenticateToken,
  authorize("DeliveryAreas", "update"),
  checkModuleEnabled("delivery"),
  validate(paramsDeliveryAreaSchema, "params"),
  deliveryAreaController.restore,
);

// Bulk
router.delete(
  "/bulk-delete",
  authenticateToken,
  authorize("DeliveryAreas", "delete"),
  checkModuleEnabled("delivery"),
  validate(paramsDeliveryAreaIdsSchema),
  deliveryAreaController.bulkHardDelete,
);

router.patch(
  "/bulk-soft-delete",
  authenticateToken,
  authorize("DeliveryAreas", "delete"),
  checkModuleEnabled("delivery"),
  validate(paramsDeliveryAreaIdsSchema),
  deliveryAreaController.bulkSoftDelete,
);

export default router;
