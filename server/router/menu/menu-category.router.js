import express from "express";
import menuCategoryController from "../../controllers/menu/menu-category.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createMenuCategorySchema, updateMenuCategorySchema } from "../../validation/menu/menu-category.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createMenuCategorySchema), menuCategoryController.create)
  .get(authenticateToken, menuCategoryController.getAll)
;

router.route("/:id")
  .get(authenticateToken, menuCategoryController.getOne)
  .put(authenticateToken, validate(updateMenuCategorySchema), menuCategoryController.update)
  .delete(authenticateToken, menuCategoryController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, menuCategoryController.restore)
;



export default router;
