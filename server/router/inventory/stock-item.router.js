const express = require("express");

const {
  createStockItem,
  getAllStockItems,
  getOneItem,
  updateStockItem,
  movements,
  deleteItem,
} = require("../../controllers/stock-item.constroller");
const { authenticateToken } = require("../../middlewares/authenticate");


const router = express.Router();

router
  .route("/")
  .post(authenticateToken,createStockItem)
  .get(authenticateToken,getAllStockItems);
router
  .route("/:itemId")
  .get(authenticateToken,getOneItem)
  .delete(authenticateToken,deleteItem)
  .put(authenticateToken,updateStockItem);
module.exports = router;
