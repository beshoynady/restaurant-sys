import express from "express";
import menuCategoryController from "../../controllers/menu/menu-category.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createMenuCategorySchema, 
  updateMenuCategorySchema, 
  paramsSchema, 
  querySchema 
} from "../../validation/menu/menu-category.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createMenuCategorySchema), menuCategoryController.create)
  .get(authenticateToken, validate(querySchema()), menuCategoryController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSchema()), menuCategoryController.getOne)
  .put(authenticateToken, validate(updateMenuCategorySchema), menuCategoryController.update)
  .delete(authenticateToken, validate(paramsSchema()), menuCategoryController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSchema()), menuCategoryController.restore)
;

export default router;
