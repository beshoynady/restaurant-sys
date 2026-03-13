const express = require("express");
const {
  createMenuCategory,
  getAllMenuCategories,
  getOneMenuCategory,
  updateMenuCategory,
  reorderMenuCategories,
  deleteMenuCategory,
} = require("../../controllers/menu/menu-category.controller");
const { authenticateToken } = require("../../middlewares/authenticate");


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
module.exports = router;
