import express from "express";
import taxConfigController from "../../controllers/system/tax-config.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createtaxConfigSchema, updatetaxConfigSchema } from "../../validation/system/tax-config.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createtaxConfigSchema), taxConfigController.create)
  .get(authenticateToken, taxConfigController.getAll)
;

router.route("/:id")
  .get(authenticateToken, taxConfigController.getOne)
  .put(authenticateToken, validate(updatetaxConfigSchema), taxConfigController.update)
  .delete(authenticateToken, taxConfigController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, taxConfigController.restore)
;



export default router;
