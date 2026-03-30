import express from "express";
import userAccountController from "../../controllers/employees/user-account.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createuserAccountSchema, updateuserAccountSchema } from "../../validation/employees/user-account.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createuserAccountSchema), userAccountController.create)
  .get(authenticateToken, userAccountController.getAll)
;

router.route("/:id")
  .get(authenticateToken, userAccountController.getOne)
  .put(authenticateToken, validate(updateuserAccountSchema), userAccountController.update)
  .delete(authenticateToken, userAccountController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, userAccountController.restore)
;



export default router;
