import express from "express";
import productionRecordController from "../../controllers/production/production-record.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createProductionRecordSchema, 
  updateProductionRecordSchema, 
  paramsSchema, 
  querySchema 
} from "../../validation/production/production-record.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createProductionRecordSchema), productionRecordController.create)
  .get(authenticateToken, validate(querySchema()), productionRecordController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSchema()), productionRecordController.getOne)
  .put(authenticateToken, validate(updateProductionRecordSchema), productionRecordController.update)
  .delete(authenticateToken, validate(paramsSchema()), productionRecordController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSchema()), productionRecordController.restore)
;

export default router;
