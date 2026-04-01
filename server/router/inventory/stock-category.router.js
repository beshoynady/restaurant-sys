import express from "express";
import stockCategoryController from "../../controllers/inventory/stock-category.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createStockCategorySchema, updateStockCategorySchema, stockCategoryParamsSchema, stockCategoryQuerySchema } from "../../validation/inventory/stock-category.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createStockCategorySchema), stockCategoryController.create)
  .get(authenticateToken, validate(stockCategoryQuerySchema), stockCategoryController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(stockCategoryParamsSchema), stockCategoryController.getOne)
  .put(authenticateToken, validate(updateStockCategorySchema), stockCategoryController.update)
  .delete(authenticateToken, validate(stockCategoryParamsSchema), stockCategoryController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(stockCategoryParamsSchema), stockCategoryController.restore)
;

export default router;
