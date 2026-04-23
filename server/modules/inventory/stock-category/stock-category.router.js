import express from "express";
import stockCategoryController from "./stock-category.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
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
  .post(authenticateToken, validate(createStockCategorySchema), stockCategoryController.create)
  .get(authenticateToken, validate(queryStockCategorySchema), stockCategoryController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsStockCategorySchema), stockCategoryController.getOne)
  .put(authenticateToken, validate(updateStockCategorySchema), stockCategoryController.update)
  .delete(authenticateToken, validate(paramsStockCategorySchema), stockCategoryController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsStockCategorySchema), stockCategoryController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsStockCategorySchema), stockCategoryController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsStockCategoryIdsSchema), stockCategoryController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsStockCategoryIdsSchema), stockCategoryController.bulkSoftDelete);


export default router;
