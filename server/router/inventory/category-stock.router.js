import express from "express";
import categoryStockController from "../../controllers/inventory/category-stock.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, categoryStockController.create)
;

router.route("/:id")
  .put(authenticateToken, categoryStockController.update)
  .delete(authenticateToken, categoryStockController.delete)
;



export default router;
