import express from "express";
import accountingSettingController from "../../controllers/accounting/accounting-setting.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createAccountingSettingSchema, updateAccountingSettingSchema } from "../../validation/accounting/accounting-setting.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createAccountingSettingSchema), accountingSettingController.create)
  .get(authenticateToken, accountingSettingController.getAll)
;

router.route("/:id")
  .get(authenticateToken, accountingSettingController.getOne)
  .put(authenticateToken, validate(updateAccountingSettingSchema), accountingSettingController.update)
  .delete(authenticateToken, accountingSettingController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, accountingSettingController.restore)
;



export default router;
