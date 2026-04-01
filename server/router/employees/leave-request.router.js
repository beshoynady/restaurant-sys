import express from "express";
import leaveRequestController from "../../controllers/employees/leave-request.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createLeaveRequestSchema, updateLeaveRequestSchema, leaveRequestParamsSchema, leaveRequestQuerySchema } from "../../validation/employees/leave-request.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createLeaveRequestSchema), leaveRequestController.create)
  .get(authenticateToken, validate(leaveRequestQuerySchema), leaveRequestController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(leaveRequestParamsSchema), leaveRequestController.getOne)
  .put(authenticateToken, validate(updateLeaveRequestSchema), leaveRequestController.update)
  .delete(authenticateToken, validate(leaveRequestParamsSchema), leaveRequestController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(leaveRequestParamsSchema), leaveRequestController.restore)
;

export default router;
