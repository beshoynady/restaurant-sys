import express from "express";
import productReviewController from "../../controllers/sales/product-review.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createProductReviewSchema, updateProductReviewSchema, productReviewParamsSchema, productReviewQuerySchema } from "../../validation/sales/product-review.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createProductReviewSchema), productReviewController.create)
  .get(authenticateToken, validate(productReviewQuerySchema), productReviewController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(productReviewParamsSchema), productReviewController.getOne)
  .put(authenticateToken, validate(updateProductReviewSchema), productReviewController.update)
  .delete(authenticateToken, validate(productReviewParamsSchema), productReviewController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(productReviewParamsSchema), productReviewController.restore)
;

export default router;
