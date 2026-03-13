const express = require("express");
const {
  CreateCategoryStock,
  getallcategoryStock,
  getonecategoryStock,
  updatecategoryStock,
  deleteCategoryStock,
} = require("../../controllers/category-stock.controller");

const { authenticateToken } = require("../../middlewares/authenticate");


const router = express.Router();

router
  .route("/")
  .post(authenticateToken,CreateCategoryStock)
  .get(authenticateToken,getallcategoryStock);
router
  .route("/:categoryStockId")
  .get(authenticateToken,getonecategoryStock)
  .put(authenticateToken,updatecategoryStock)
  .delete(authenticateToken,deleteCategoryStock);

module.exports = router;
