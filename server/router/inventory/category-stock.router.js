const express = require("express");
const {
  CreateCategoryStock,
  getallcategoryStock,
  getonecategoryStock,
  updatecategoryStock,
  deleteCategoryStock,
} = require("../controllers/category-stock.controller");

const { authenticateToken } = require("../../middlewares/authenticate");
const checkSubscription = require("../../middlewares/checkSubscription");

const router = express.Router();

router
  .route("/")
  .post(authenticateToken, checkSubscription, CreateCategoryStock)
  .get(authenticateToken, checkSubscription, getallcategoryStock);
router
  .route("/:categoryStockId")
  .get(authenticateToken, checkSubscription, getonecategoryStock)
  .put(authenticateToken, checkSubscription, updatecategoryStock)
  .delete(authenticateToken, checkSubscription, deleteCategoryStock);

module.exports = router;
