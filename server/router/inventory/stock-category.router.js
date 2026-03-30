import express from "express";
import stockCategoryController from "../../controllers/inventory/stock-category.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, stockCategoryController.create)
  .get(authenticateToken, stockCategoryController.getAll)
;

router.route("/:id")
  .get(authenticateToken, stockCategoryController.getOne)
  .put(authenticateToken, stockCategoryController.update)
  .delete(authenticateToken, stockCategoryController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, stockCategoryController.restore)
;



export default router;
