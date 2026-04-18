import express from "express";
import productionRecordController from "../../controllers/production/production-record.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createProductionRecordSchema, 
  updateProductionRecordSchema, 
  paramsProductionRecordSchema, 
  paramsProductionRecordIdsSchema,
  queryProductionRecordSchema 
} from "../../validation/production/production-record.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createProductionRecordSchema), productionRecordController.create)
  .get(authenticateToken, validate(queryProductionRecordSchema), productionRecordController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsProductionRecordSchema), productionRecordController.getOne)
  .put(authenticateToken, validate(updateProductionRecordSchema), productionRecordController.update)
  .delete(authenticateToken, validate(paramsProductionRecordSchema), productionRecordController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsProductionRecordSchema), productionRecordController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsProductionRecordSchema), productionRecordController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsProductionRecordIdsSchema), productionRecordController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsProductionRecordIdsSchema), productionRecordController.bulkSoftDelete);


export default router;
