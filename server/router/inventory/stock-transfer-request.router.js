import express from "express";
import stockTransferRequestController from "../../controllers/inventory/stock-transfer-request.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createStockTransferRequestSchema, updateStockTransferRequestSchema } from "../../validation/inventory/stock-transfer-request.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createStockTransferRequestSchema), stockTransferRequestController.create)
  .get(authenticateToken, stockTransferRequestController.getAll)
;

router.route("/:id")
  .get(authenticateToken, stockTransferRequestController.getOne)
  .put(authenticateToken, validate(updateStockTransferRequestSchema), stockTransferRequestController.update)
  .delete(authenticateToken, stockTransferRequestController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, stockTransferRequestController.restore)
;



export default router;
