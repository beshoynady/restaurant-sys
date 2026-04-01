import express from "express";
import categoryStockController from "../../controllers/inventory/category-stock.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createCategoryStockSchema, 
  updateCategoryStockSchema, 
  paramsSchema, 
  querySchema 
} from "../../validation/inventory/category-stock.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createCategoryStockSchema), categoryStockController.create)
  .get(authenticateToken, validate(querySchema()), categoryStockController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSchema()), categoryStockController.getOne)
  .put(authenticateToken, validate(updateCategoryStockSchema), categoryStockController.update)
  .delete(authenticateToken, validate(paramsSchema()), categoryStockController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSchema()), categoryStockController.restore)
;

export default router;
