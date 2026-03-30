import express from "express";
import preparationTicketController from "../../controllers/kitchen/preparation-ticket.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createpreparationTicketSchema, updatepreparationTicketSchema } from "../../validation/kitchen/preparation-ticket.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createpreparationTicketSchema), preparationTicketController.create)
  .get(authenticateToken, preparationTicketController.getAll)
;

router.route("/:id")
  .get(authenticateToken, preparationTicketController.getOne)
  .put(authenticateToken, validate(updatepreparationTicketSchema), preparationTicketController.update)
  .delete(authenticateToken, preparationTicketController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, preparationTicketController.restore)
;



export default router;
