import express, { Request, Response, NextFunction } from "express";
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

const deliveryAreaConfig = (req: Request, _res: Response, next: NextFunction) => {
  (req as any).populate = ["brand", "branch", "createdBy", "updatedBy"];
  (req as any).uniqueFields = ["code"];
  (req as any).fieldsWithLang = ["name"];
  next();
};

// =====================================================
// PUBLIC (Customer / Checkout)
// =====================================================

router.get("/branch/:branchId/active", deliveryAreaController.getActiveAreasByBranch);
router.get("/:areaId/summary", deliveryAreaController.getDeliverySummary);
router.get("/:areaId/calculate", deliveryAreaController.calculateDeliveryFee);
router.post("/:areaId/validate", deliveryAreaController.validateOrder);

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
