import express from "express";
import deliveryAreaController from "./delivery-area.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";

import {
  createDeliveryAreaSchema,
  updateDeliveryAreaSchema,
  paramsDeliveryAreaSchema,
  paramsDeliveryAreaIdsSchema,
  queryDeliveryAreaSchema,
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

router.get("/branch/:branchId/active", deliveryAreaController.getActiveAreasByBranch);
router.get("/branch/:branchId/:areaId/summary", deliveryAreaController.getDeliverySummary);
router.get("/branch/:branchId/:areaId/calculate", deliveryAreaController.calculateDeliveryFee);
router.post("/branch/:branchId/:areaId/validate", deliveryAreaController.validateOrder);

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
    validate(paramsDeliveryAreaSchema),
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
    validate(paramsDeliveryAreaSchema),
    deliveryAreaController.hardDelete,
  );

// Soft delete
router.patch(
  "/soft-delete/:id",
  authenticateToken,
  authorize("DeliveryAreas", "delete"),
  checkModuleEnabled("delivery"),
  validate(paramsDeliveryAreaSchema),
  deliveryAreaController.softDelete,
);

// Restore
router.patch(
  "/restore/:id",
  authenticateToken,
  authorize("DeliveryAreas", "update"),
  checkModuleEnabled("delivery"),
  validate(paramsDeliveryAreaSchema),
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
