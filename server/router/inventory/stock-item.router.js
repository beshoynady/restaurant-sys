import express from "express";
import stockItemController from "../../controllers/inventory/stock-item.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createstockItemSchema, updatestockItemSchema } from "../../validation/inventory/stock-item.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createstockItemSchema), stockItemController.create)
  .get(authenticateToken, stockItemController.getAll)
;

router.route("/:id")
  .get(authenticateToken, stockItemController.getOne)
  .put(authenticateToken, validate(updatestockItemSchema), stockItemController.update)
  .delete(authenticateToken, stockItemController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, stockItemController.restore)
;



export default router;
