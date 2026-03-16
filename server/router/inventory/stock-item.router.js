import express from "express";

import {
  createStockItem,
  getAllStockItems,
  getOneItem,
  updateStockItem,
  deleteItem,
} from "../../controllers/inventory/stock-item.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";


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

export default router;
