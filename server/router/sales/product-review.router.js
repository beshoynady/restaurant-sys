import express from "express";
import productReviewController from "../../controllers/sales/product-review.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createProductReviewSchema, 
  updateProductReviewSchema, 
  paramsSchema, 
  querySchema 
} from "../../validation/sales/product-review.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createProductReviewSchema), productReviewController.create)
  .get(authenticateToken, validate(querySchema()), productReviewController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSchema()), productReviewController.getOne)
  .put(authenticateToken, validate(updateProductReviewSchema), productReviewController.update)
  .delete(authenticateToken, validate(paramsSchema()), productReviewController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSchema()), productReviewController.restore)
;

export default router;
