import express from "express";
import {
  CreateCategoryStock,
  getallcategoryStock,
  getonecategoryStock,
  updatecategoryStock,
  deleteCategoryStock,
} from "../../controllers/category-stock.controller.js";

import { authenticateToken } from "../../middlewares/authenticate.js";


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

export default router;
