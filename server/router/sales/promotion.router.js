import express from "express";
import promotionController from "../../controllers/sales/promotion.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createPromotionSchema, 
  updatePromotionSchema, 
  paramsPromotionSchema, 
  paramsPromotionIdsSchema,
  queryPromotionSchema 
} from "../../validation/sales/promotion.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createPromotionSchema), promotionController.create)
  .get(authenticateToken, validate(queryPromotionSchema), promotionController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsPromotionSchema), promotionController.getOne)
  .put(authenticateToken, validate(updatePromotionSchema), promotionController.update)
  .delete(authenticateToken, validate(paramsPromotionSchema), promotionController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsPromotionSchema), promotionController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsPromotionSchema), promotionController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsPromotionIdsSchema), promotionController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsPromotionIdsSchema), promotionController.bulkSoftDelete);


export default router;
