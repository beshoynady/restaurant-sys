import express from "express";
import bankAccountController from "../../controllers/cash/bank-account.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createbankAccountSchema, updatebankAccountSchema } from "../../validation/cash/bank-account.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createbankAccountSchema), bankAccountController.create)
  .get(authenticateToken, bankAccountController.getAll)
;

router.route("/:id")
  .get(authenticateToken, bankAccountController.getOne)
  .put(authenticateToken, validate(updatebankAccountSchema), bankAccountController.update)
  .delete(authenticateToken, bankAccountController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, bankAccountController.restore)
;



export default router;
