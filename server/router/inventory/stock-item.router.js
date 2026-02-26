const express = require("express");

const {
  createStockItem,
  getAllStockItems,
  getOneItem,
  updateStockItem,
  movements,
  deleteItem,
} = require("../controllers/stock-item.constroller");
const { authenticateToken } = require("../../middlewares/authenticate");
const checkSubscription = require("../../middlewares/checkSubscription");

const router = express.Router();

router
  .route("/")
  .post(authenticateToken, checkSubscription, createStockItem)
  .get(authenticateToken, checkSubscription, getAllStockItems);
router
  .route("/:itemId")
  .get(authenticateToken, checkSubscription, getOneItem)
  .delete(authenticateToken, checkSubscription, deleteItem)
  .put(authenticateToken, checkSubscription, updateStockItem);
module.exports = router;
