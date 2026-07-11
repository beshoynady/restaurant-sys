import express from "express";
import messageController from "./message.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import { 
  createMessageSchema, 
  updateMessageSchema, 
  paramsMessageSchema, 
  paramsMessageIdsSchema,
  queryMessageSchema 
} from "./message.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken,
    authorize("Messages", "create"),
    checkModuleEnabled("crm"), validate(createMessageSchema), messageController.create)
  .get(authenticateToken,
    authorize("Messages", "read"),
    checkModuleEnabled("crm"), validate(queryMessageSchema), messageController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken,
    authorize("Messages", "read"),
    checkModuleEnabled("crm"), validate(paramsMessageSchema), messageController.getOne)
  .put(authenticateToken,
    authorize("Messages", "update"),
    checkModuleEnabled("crm"), validate(updateMessageSchema), messageController.update)
  .delete(authenticateToken,
    authorize("Messages", "delete"),
    checkModuleEnabled("crm"), validate(paramsMessageSchema), messageController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken,
    authorize("Messages", "delete"),
    checkModuleEnabled("crm"), validate(paramsMessageSchema), messageController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken,
    authorize("Messages", "update"),
    checkModuleEnabled("crm"), validate(paramsMessageSchema), messageController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken,
    authorize("Messages", "delete"),
    checkModuleEnabled("crm"), validate(paramsMessageIdsSchema), messageController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,
    authorize("Messages", "delete"),
    checkModuleEnabled("crm"),validate(paramsMessageIdsSchema), messageController.bulkSoftDelete);


export default router;
