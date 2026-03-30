import express from "express";
import accountController from "../../controllers/accounting/account.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createaccountSchema, updateaccountSchema } from "../../validation/accounting/account.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createaccountSchema), accountController.create)
  .get(authenticateToken, accountController.getAll)
;

router.route("/:id")
  .get(authenticateToken, accountController.getOne)
  .put(authenticateToken, validate(updateaccountSchema), accountController.update)
  .delete(authenticateToken, accountController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, accountController.restore)
;



export default router;
