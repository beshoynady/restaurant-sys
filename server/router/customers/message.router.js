import express from "express";
import messageController from "../../controllers/customers/message.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createmessageSchema, updatemessageSchema } from "../../validation/customers/message.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createmessageSchema), messageController.create)
  .get(authenticateToken, messageController.getAll)
;

router.route("/:id")
  .get(authenticateToken, messageController.getOne)
  .put(authenticateToken, validate(updatemessageSchema), messageController.update)
  .delete(authenticateToken, messageController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, messageController.restore)
;



export default router;
