import express from "express";
import leaveRequestController from "../../controllers/employees/leave-request.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createLeaveRequestSchema, 
  updateLeaveRequestSchema, 
  paramsSchema, 
  querySchema 
} from "../../validation/employees/leave-request.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createLeaveRequestSchema), leaveRequestController.create)
  .get(authenticateToken, validate(querySchema()), leaveRequestController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSchema()), leaveRequestController.getOne)
  .put(authenticateToken, validate(updateLeaveRequestSchema), leaveRequestController.update)
  .delete(authenticateToken, validate(paramsSchema()), leaveRequestController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSchema()), leaveRequestController.restore)
;

export default router;
