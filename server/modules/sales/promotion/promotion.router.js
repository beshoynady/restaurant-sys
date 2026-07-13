import express from "express";
import promotionController from "./promotion.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import {
  createPromotionSchema,
  updatePromotionSchema,
  paramsPromotionSchema,
  paramsPromotionIdsSchema,
  queryPromotionSchema
} from "./promotion.validation.js";

const router = express.Router();

// PLATFORM_FINAL_AUDIT.md PA-13: same missing-RBAC defect as
// sales-return.router.js — fixed the same way.

// Create & GetAll
router.route("/")
  .post(authenticateToken, authorize("Promotions", "create"), checkModuleEnabled("sales"), validate(createPromotionSchema), promotionController.create)
  .get(authenticateToken, authorize("Promotions", "read"), checkModuleEnabled("sales"), validate(queryPromotionSchema), promotionController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, authorize("Promotions", "read"), checkModuleEnabled("sales"), validate(paramsPromotionSchema, "params"), promotionController.getOne)
  .put(authenticateToken, authorize("Promotions", "update"), checkModuleEnabled("sales"), validate(updatePromotionSchema), promotionController.update)
  .delete(authenticateToken, authorize("Promotions", "delete"), checkModuleEnabled("sales"), validate(paramsPromotionSchema, "params"), promotionController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, authorize("Promotions", "delete"), checkModuleEnabled("sales"), validate(paramsPromotionSchema, "params"), promotionController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, authorize("Promotions", "update"), checkModuleEnabled("sales"), validate(paramsPromotionSchema, "params"), promotionController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, authorize("Promotions", "delete"), checkModuleEnabled("sales"), validate(paramsPromotionIdsSchema), promotionController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken, authorize("Promotions", "delete"), checkModuleEnabled("sales"), validate(paramsPromotionIdsSchema), promotionController.bulkSoftDelete);


export default router;
