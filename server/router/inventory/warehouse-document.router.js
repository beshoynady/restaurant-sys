import express from "express";
import warehouseDocumentController from "../../controllers/inventory/warehouse-document.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createWarehouseDocumentSchema, updateWarehouseDocumentSchema } from "../../validation/inventory/warehouse-document.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createWarehouseDocumentSchema), warehouseDocumentController.create)
  .get(authenticateToken, warehouseDocumentController.getAll)
;

router.route("/:id")
  .get(authenticateToken, warehouseDocumentController.getOne)
  .put(authenticateToken, validate(updateWarehouseDocumentSchema), warehouseDocumentController.update)
  .delete(authenticateToken, warehouseDocumentController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, warehouseDocumentController.restore)
;



export default router;
