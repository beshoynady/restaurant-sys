import express from "express";
import categoryStockController from "../../controllers/inventory/category-stock.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createCategoryStockSchema, 
  updateCategoryStockSchema, 
  paramsCategoryStockSchema, 
  paramsCategoryStockIdsSchema,
  queryCategoryStockSchema 
} from "../../validation/inventory/category-stock.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createCategoryStockSchema), categoryStockController.create)
  .get(authenticateToken, validate(queryCategoryStockSchema), categoryStockController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsCategoryStockSchema), categoryStockController.getOne)
  .put(authenticateToken, validate(updateCategoryStockSchema), categoryStockController.update)
  .delete(authenticateToken, validate(paramsCategoryStockSchema), categoryStockController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsCategoryStockSchema), categoryStockController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsCategoryStockSchema), categoryStockController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsCategoryStockIdsSchema), categoryStockController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsCategoryStockIdsSchema), categoryStockController.bulkSoftDelete);


export default router;
