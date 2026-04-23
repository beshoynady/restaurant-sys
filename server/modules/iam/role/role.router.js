import express from "express";
import roleController from "./role.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createRoleSchema, 
  updateRoleSchema, 
  paramsRoleSchema, 
  paramsRoleIdsSchema,
  queryRoleSchema 
} from "../../validation/employees/role.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createRoleSchema), roleController.create)
  .get(authenticateToken, validate(queryRoleSchema), roleController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsRoleSchema), roleController.getOne)
  .put(authenticateToken, validate(updateRoleSchema), roleController.update)
  .delete(authenticateToken, validate(paramsRoleSchema), roleController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsRoleSchema), roleController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsRoleSchema), roleController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsRoleIdsSchema), roleController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsRoleIdsSchema), roleController.bulkSoftDelete);


export default router;
