import express from "express";
import warehouseDocumentController from "./warehouse-document.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import validate from "../../../middlewares/validate.js";
import { 
  createWarehouseDocumentSchema, 
  updateWarehouseDocumentSchema, 
  paramsWarehouseDocumentSchema, 
  paramsWarehouseDocumentIdsSchema,
  queryWarehouseDocumentSchema 
} from "./warehouse-document.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createWarehouseDocumentSchema), warehouseDocumentController.create)
  .get(authenticateToken, validate(queryWarehouseDocumentSchema), warehouseDocumentController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsWarehouseDocumentSchema), warehouseDocumentController.getOne)
  .put(authenticateToken, validate(updateWarehouseDocumentSchema), warehouseDocumentController.update)
  .delete(authenticateToken, validate(paramsWarehouseDocumentSchema), warehouseDocumentController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsWarehouseDocumentSchema), warehouseDocumentController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsWarehouseDocumentSchema), warehouseDocumentController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsWarehouseDocumentIdsSchema), warehouseDocumentController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsWarehouseDocumentIdsSchema), warehouseDocumentController.bulkSoftDelete);


export default router;
