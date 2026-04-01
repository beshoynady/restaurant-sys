import express from "express";
import messageController from "../../controllers/customers/message.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createMessageSchema, updateMessageSchema, messageParamsSchema, messageQuerySchema } from "../../validation/customers/message.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createMessageSchema), messageController.create)
  .get(authenticateToken, validate(messageQuerySchema), messageController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(messageParamsSchema), messageController.getOne)
  .put(authenticateToken, validate(updateMessageSchema), messageController.update)
  .delete(authenticateToken, validate(messageParamsSchema), messageController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(messageParamsSchema), messageController.restore)
;

export default router;
