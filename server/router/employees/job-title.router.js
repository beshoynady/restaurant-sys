import express from "express";
import jobTitleController from "../../controllers/employees/job-title.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createJobTitleSchema, 
  updateJobTitleSchema, 
  paramsSchema, 
  querySchema 
} from "../../validation/employees/job-title.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createJobTitleSchema), jobTitleController.create)
  .get(authenticateToken, validate(querySchema()), jobTitleController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSchema()), jobTitleController.getOne)
  .put(authenticateToken, validate(updateJobTitleSchema), jobTitleController.update)
  .delete(authenticateToken, validate(paramsSchema()), jobTitleController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSchema()), jobTitleController.restore)
;

export default router;
