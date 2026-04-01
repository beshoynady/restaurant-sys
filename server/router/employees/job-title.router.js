import express from "express";
import jobTitleController from "../../controllers/employees/job-title.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createJobTitleSchema, updateJobTitleSchema, jobTitleParamsSchema, jobTitleQuerySchema } from "../../validation/employees/job-title.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createJobTitleSchema), jobTitleController.create)
  .get(authenticateToken, validate(jobTitleQuerySchema), jobTitleController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(jobTitleParamsSchema), jobTitleController.getOne)
  .put(authenticateToken, validate(updateJobTitleSchema), jobTitleController.update)
  .delete(authenticateToken, validate(jobTitleParamsSchema), jobTitleController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(jobTitleParamsSchema), jobTitleController.restore)
;

export default router;
