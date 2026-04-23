import express from "express";
import jobTitleController from "./job-title.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createJobTitleSchema, 
  updateJobTitleSchema, 
  paramsJobTitleSchema, 
  paramsJobTitleIdsSchema,
  queryJobTitleSchema 
} from "../../validation/employees/job-title.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createJobTitleSchema), jobTitleController.create)
  .get(authenticateToken, validate(queryJobTitleSchema), jobTitleController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsJobTitleSchema), jobTitleController.getOne)
  .put(authenticateToken, validate(updateJobTitleSchema), jobTitleController.update)
  .delete(authenticateToken, validate(paramsJobTitleSchema), jobTitleController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsJobTitleSchema), jobTitleController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsJobTitleSchema), jobTitleController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsJobTitleIdsSchema), jobTitleController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsJobTitleIdsSchema), jobTitleController.bulkSoftDelete);


export default router;
