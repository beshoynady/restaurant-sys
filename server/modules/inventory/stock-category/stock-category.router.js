import express from "express";
import stockCategoryController from "./stock-category.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import {
  createStockCategorySchema,
  updateStockCategorySchema,
  paramsStockCategorySchema,
  paramsStockCategoryIdsSchema,
  queryStockCategorySchema
} from "./stock-category.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken,
    authorize("StockCategories", "create"),
    checkModuleEnabled("inventory"), validate(createStockCategorySchema), stockCategoryController.create)
  .get(authenticateToken,
    authorize("StockCategories", "read"),
    checkModuleEnabled("inventory"), validate(queryStockCategorySchema), stockCategoryController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken,
    authorize("StockCategories", "read"),
    checkModuleEnabled("inventory"), validate(paramsStockCategorySchema, "params"), stockCategoryController.getOne)
  .put(authenticateToken,
    authorize("StockCategories", "update"),
    checkModuleEnabled("inventory"), validate(updateStockCategorySchema), stockCategoryController.update)
  .delete(authenticateToken,
    authorize("StockCategories", "delete"),
    checkModuleEnabled("inventory"), validate(paramsStockCategorySchema, "params"), stockCategoryController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken,
    authorize("StockCategories", "delete"),
    checkModuleEnabled("inventory"), validate(paramsStockCategorySchema, "params"), stockCategoryController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken,
    authorize("StockCategories", "update"),
    checkModuleEnabled("inventory"), validate(paramsStockCategorySchema, "params"), stockCategoryController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken,
    authorize("StockCategories", "delete"),
    checkModuleEnabled("inventory"), validate(paramsStockCategoryIdsSchema), stockCategoryController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,
    authorize("StockCategories", "delete"),
    checkModuleEnabled("inventory"),validate(paramsStockCategoryIdsSchema), stockCategoryController.bulkSoftDelete);


export default router;
