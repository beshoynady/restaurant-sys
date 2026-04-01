import express from "express";
import roleController from "../../controllers/employees/role.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createRoleSchema, updateRoleSchema, roleParamsSchema, roleQuerySchema } from "../../validation/employees/role.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createRoleSchema), roleController.create)
  .get(authenticateToken, validate(roleQuerySchema), roleController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(roleParamsSchema), roleController.getOne)
  .put(authenticateToken, validate(updateRoleSchema), roleController.update)
  .delete(authenticateToken, validate(roleParamsSchema), roleController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(roleParamsSchema), roleController.restore)
;

export default router;
