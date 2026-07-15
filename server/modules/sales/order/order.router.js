import express from "express";
import orderController from "./order.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import {
  createOrderSchema,
  updateOrderSchema,
  paramsOrderSchema,
  paramsOrderIdsSchema,
  queryOrderSchema,
  transitionOrderSchema,
  cancelOrderItemSchema,
  paramsOrderItemSchema,
} from "./order.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken,
    authorize("Orders", "create"),
    checkModuleEnabled("sales"), validate(createOrderSchema), orderController.create)
  .get(authenticateToken,
    authorize("Orders", "read"),
    checkModuleEnabled("sales"), validate(queryOrderSchema), orderController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken,
    authorize("Orders", "read"),
    checkModuleEnabled("sales"), validate(paramsOrderSchema, "params"), orderController.getOne)
  .put(authenticateToken,
    authorize("Orders", "update"),
    checkModuleEnabled("sales"), validate(updateOrderSchema), orderController.update)
  .delete(authenticateToken,
    authorize("Orders", "delete"),
    checkModuleEnabled("sales"), validate(paramsOrderSchema, "params"), orderController.hardDelete) // soft delete
;

// PLATFORM_FINAL_AUDIT.md PA-03, corrected: soft-delete/restore/
// bulk-soft-delete removed — Order already has a CANCELLED status; cancel
// via PUT, not deletion.

// Enterprise Production Platform: real state-machine transition, closing the confirmed gap that
// `status` previously had zero transition enforcement anywhere (any PUT could set any status).
router.route("/:id/transition")
  .post(authenticateToken,
    authorize("Orders", "update"),
    checkModuleEnabled("sales"), validate(paramsOrderSchema, "params"), validate(transitionOrderSchema), orderController.transition);

// Automatic Recipe Consumption — Manual Override.
router.route("/:id/consume-recipe")
  .post(authenticateToken,
    authorize("Orders", "update"),
    checkModuleEnabled("sales"), validate(paramsOrderSchema, "params"), orderController.consumeRecipe);

// Enterprise Order Management Platform: item-level void/cancel, with kitchen recall. Gated by the
// same "Orders"/"update" permission general order editing already requires — NOT a fabricated
// "cancelItem" action, which would silently fail for everyone: `Role.permissions[]` is a fixed
// Mongoose sub-schema (`create/read/update/delete/viewReports/approve/reject/reverse` only, see
// role.model.js) that strips any undeclared field on save, so `authorize("Orders","cancelItem")`
// would deny every user, including Owner. Manager approval (when
// `OrderSettings.requireManagerApprovalForCancel` is on) is enforced separately, inside
// order.service.ts#cancelItem, against the real declared `approve` permission field.
router.route("/:id/items/:itemId/cancel")
  .patch(authenticateToken,
    authorize("Orders", "update"),
    checkModuleEnabled("sales"), validate(paramsOrderItemSchema, "params"), validate(cancelOrderItemSchema), orderController.cancelItem);

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken,
    authorize("Orders", "delete"),
    checkModuleEnabled("sales"), validate(paramsOrderIdsSchema), orderController.bulkHardDelete);


export default router;
