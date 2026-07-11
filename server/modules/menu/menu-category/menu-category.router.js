import express from "express";
import menuCategoryController from "./menu-category.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
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
  .post(authenticateToken,
    authorize("MenuCategories", "create"),
    checkModuleEnabled("menu"), validate(createMenuCategorySchema), menuCategoryController.create)
  .get(authenticateToken,
    authorize("MenuCategories", "read"),
    checkModuleEnabled("menu"), validate(queryMenuCategorySchema), menuCategoryController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken,
    authorize("MenuCategories", "read"),
    checkModuleEnabled("menu"), validate(paramsMenuCategorySchema), menuCategoryController.getOne)
  .put(authenticateToken,
    authorize("MenuCategories", "update"),
    checkModuleEnabled("menu"), validate(updateMenuCategorySchema), menuCategoryController.update)
  .delete(authenticateToken,
    authorize("MenuCategories", "delete"),
    checkModuleEnabled("menu"), validate(paramsMenuCategorySchema), menuCategoryController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken,
    authorize("MenuCategories", "delete"),
    checkModuleEnabled("menu"), validate(paramsMenuCategorySchema), menuCategoryController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken,
    authorize("MenuCategories", "update"),
    checkModuleEnabled("menu"), validate(paramsMenuCategorySchema), menuCategoryController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken,
    authorize("MenuCategories", "delete"),
    checkModuleEnabled("menu"), validate(paramsMenuCategoryIdsSchema), menuCategoryController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,
    authorize("MenuCategories", "delete"),
    checkModuleEnabled("menu"),validate(paramsMenuCategoryIdsSchema), menuCategoryController.bulkSoftDelete);


export default router;
