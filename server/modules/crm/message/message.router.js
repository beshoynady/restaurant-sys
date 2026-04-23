import express from "express";
import messageController from "./message.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
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
  .post(authenticateToken, validate(createMessageSchema), messageController.create)
  .get(authenticateToken, validate(queryMessageSchema), messageController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsMessageSchema), messageController.getOne)
  .put(authenticateToken, validate(updateMessageSchema), messageController.update)
  .delete(authenticateToken, validate(paramsMessageSchema), messageController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsMessageSchema), messageController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsMessageSchema), messageController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsMessageIdsSchema), messageController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsMessageIdsSchema), messageController.bulkSoftDelete);


export default router;
