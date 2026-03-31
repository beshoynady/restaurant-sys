import express from "express";
import messageController from "../../controllers/customers/message.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createMessageSchema, updateMessageSchema } from "../../validation/customers/message.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createMessageSchema), messageController.create)
  .get(authenticateToken, messageController.getAll)
;

router.route("/:id")
  .get(authenticateToken, messageController.getOne)
  .put(authenticateToken, validate(updateMessageSchema), messageController.update)
  .delete(authenticateToken, messageController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, messageController.restore)
;



export default router;
