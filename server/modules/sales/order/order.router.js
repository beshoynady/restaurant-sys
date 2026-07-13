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
  queryOrderSchema 
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

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken,
    authorize("Orders", "delete"),
    checkModuleEnabled("sales"), validate(paramsOrderIdsSchema), orderController.bulkHardDelete);


export default router;
