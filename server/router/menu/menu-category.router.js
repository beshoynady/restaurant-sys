const express = require("express");
const {
  createMenuCategory,
  getAllMenuCategories,
  getOneMenuCategory,
  updateMenuCategory,
  reorderMenuCategories,
  deleteMenuCategory,
} = require("../../controllers/menu-category.controller");
const { authenticateToken } = require("../../middlewares/authenticate");
const checkSubscription = require("../../middlewares/checkSubscription");

const router = express.Router();

router
  .route("/")
  .post(authenticateToken, checkSubscription, createMenuCategory)
  .get(getAllMenuCategories);
router
  .route("/:menuCategoryId")
  .get(getOneMenuCategory)
  .put(authenticateToken, checkSubscription, updateMenuCategory)
  .delete(authenticateToken, checkSubscription, deleteMenuCategory);

router
  .route("/reorder")
  .patch(authenticateToken, checkSubscription, reorderMenuCategories);
module.exports = router;
