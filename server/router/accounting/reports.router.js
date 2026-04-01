import express from "express";
import reportsController from "../../controllers/accounting/reports.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createReportsSchema, 
  updateReportsSchema, 
  paramsSchema, 
  querySchema 
} from "../../validation/accounting/reports.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createReportsSchema), reportsController.create)
  .get(authenticateToken, validate(querySchema()), reportsController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSchema()), reportsController.getOne)
  .put(authenticateToken, validate(updateReportsSchema), reportsController.update)
  .delete(authenticateToken, validate(paramsSchema()), reportsController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSchema()), reportsController.restore)
;

export default router;
