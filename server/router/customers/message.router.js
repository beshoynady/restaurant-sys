import express from "express";
import messageController from "../../controllers/customers/message.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createMessageSchema, 
  updateMessageSchema, 
  paramsSchema, 
  querySchema 
} from "../../validation/customers/message.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createMessageSchema), messageController.create)
  .get(authenticateToken, validate(querySchema()), messageController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSchema()), messageController.getOne)
  .put(authenticateToken, validate(updateMessageSchema), messageController.update)
  .delete(authenticateToken, validate(paramsSchema()), messageController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSchema()), messageController.restore)
;

export default router;
