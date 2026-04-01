import express from "express";
import stockCategoryController from "../../controllers/inventory/stock-category.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createStockCategorySchema, 
  updateStockCategorySchema, 
  paramsSchema, 
  querySchema 
} from "../../validation/inventory/stock-category.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createStockCategorySchema), stockCategoryController.create)
  .get(authenticateToken, validate(querySchema()), stockCategoryController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSchema()), stockCategoryController.getOne)
  .put(authenticateToken, validate(updateStockCategorySchema), stockCategoryController.update)
  .delete(authenticateToken, validate(paramsSchema()), stockCategoryController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSchema()), stockCategoryController.restore)
;

export default router;
