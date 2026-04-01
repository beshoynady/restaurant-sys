import express from "express";
import promotionController from "../../controllers/sales/promotion.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createPromotionSchema, updatePromotionSchema, promotionParamsSchema, promotionQuerySchema } from "../../validation/sales/promotion.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createPromotionSchema), promotionController.create)
  .get(authenticateToken, validate(promotionQuerySchema), promotionController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(promotionParamsSchema), promotionController.getOne)
  .put(authenticateToken, validate(updatePromotionSchema), promotionController.update)
  .delete(authenticateToken, validate(promotionParamsSchema), promotionController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(promotionParamsSchema), promotionController.restore)
;

export default router;
