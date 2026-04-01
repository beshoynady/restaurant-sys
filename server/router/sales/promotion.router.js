import express from "express";
import promotionController from "../../controllers/sales/promotion.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createPromotionSchema, 
  updatePromotionSchema, 
  paramsSchema, 
  querySchema 
} from "../../validation/sales/promotion.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createPromotionSchema), promotionController.create)
  .get(authenticateToken, validate(querySchema()), promotionController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSchema()), promotionController.getOne)
  .put(authenticateToken, validate(updatePromotionSchema), promotionController.update)
  .delete(authenticateToken, validate(paramsSchema()), promotionController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSchema()), promotionController.restore)
;

export default router;
