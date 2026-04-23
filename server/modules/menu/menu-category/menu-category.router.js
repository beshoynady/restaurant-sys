import express from "express";
import menuCategoryController from "./menu-category.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createMenuCategorySchema, 
  updateMenuCategorySchema, 
  paramsMenuCategorySchema, 
  paramsMenuCategoryIdsSchema,
  queryMenuCategorySchema 
} from "./menu-category.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createMenuCategorySchema), menuCategoryController.create)
  .get(authenticateToken, validate(queryMenuCategorySchema), menuCategoryController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsMenuCategorySchema), menuCategoryController.getOne)
  .put(authenticateToken, validate(updateMenuCategorySchema), menuCategoryController.update)
  .delete(authenticateToken, validate(paramsMenuCategorySchema), menuCategoryController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsMenuCategorySchema), menuCategoryController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsMenuCategorySchema), menuCategoryController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsMenuCategoryIdsSchema), menuCategoryController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsMenuCategoryIdsSchema), menuCategoryController.bulkSoftDelete);


export default router;
