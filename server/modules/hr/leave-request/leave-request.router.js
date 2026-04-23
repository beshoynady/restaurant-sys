import express from "express";
import leaveRequestController from "./leave-request.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createLeaveRequestSchema, 
  updateLeaveRequestSchema, 
  paramsLeaveRequestSchema, 
  paramsLeaveRequestIdsSchema,
  queryLeaveRequestSchema 
} from "../../validation/employees/leave-request.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createLeaveRequestSchema), leaveRequestController.create)
  .get(authenticateToken, validate(queryLeaveRequestSchema), leaveRequestController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsLeaveRequestSchema), leaveRequestController.getOne)
  .put(authenticateToken, validate(updateLeaveRequestSchema), leaveRequestController.update)
  .delete(authenticateToken, validate(paramsLeaveRequestSchema), leaveRequestController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsLeaveRequestSchema), leaveRequestController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsLeaveRequestSchema), leaveRequestController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsLeaveRequestIdsSchema), leaveRequestController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsLeaveRequestIdsSchema), leaveRequestController.bulkSoftDelete);


export default router;
