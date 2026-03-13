import express from "express";
import {
  createMenuCategory,
  getAllMenuCategories,
  getOneMenuCategory,
  updateMenuCategory,
  reorderMenuCategories,
  deleteMenuCategory,
} from "../../controllers/menu/menu-category.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";


const router = express.Router();

router
  .route("/")
  .post(authenticateToken,createMenuCategory)
  .get(getAllMenuCategories);
router
  .route("/:menuCategoryId")
  .get(getOneMenuCategory)
  .put(authenticateToken,updateMenuCategory)
  .delete(authenticateToken,deleteMenuCategory);

router
  .route("/reorder")
  .patch(authenticateToken,reorderMenuCategories);

export default router;
