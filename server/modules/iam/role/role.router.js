import express from "express";
import roleController from "./role.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import validate from "../../../middlewares/validate.js";
import { 
  createRoleSchema, 
  updateRoleSchema, 
  paramsRoleSchema, 
  paramsRoleIdsSchema,
  queryRoleSchema 
} from "./role.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken,
    authorize("Roles", "create"), validate(createRoleSchema), roleController.create)
  .get(authenticateToken,
    authorize("Roles", "read"), validate(queryRoleSchema), roleController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken,
    authorize("Roles", "read"), validate(paramsRoleSchema, "params"), roleController.getOne)
  .put(authenticateToken,
    authorize("Roles", "update"), validate(updateRoleSchema), roleController.update)
  .delete(authenticateToken,
    authorize("Roles", "delete"), validate(paramsRoleSchema, "params"), roleController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken,
    authorize("Roles", "delete"), validate(paramsRoleSchema, "params"), roleController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken,
    authorize("Roles", "update"), validate(paramsRoleSchema, "params"), roleController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken,
    authorize("Roles", "delete"), validate(paramsRoleIdsSchema), roleController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,
    authorize("Roles", "delete"),validate(paramsRoleIdsSchema), roleController.bulkSoftDelete);


export default router;
