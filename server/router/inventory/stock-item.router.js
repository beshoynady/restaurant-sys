import express from "express";

import {
  createStockItem,
  getAllStockItems,
  getOneItem,
  updateStockItem,
  movements,
  deleteItem,
} from "../../controllers/stock-item.constroller.js";
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
