import express from "express";
import branchSettingsController from "../../controllers/core/branch-settings.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createbranchSettingsSchema, updatebranchSettingsSchema } from "../../validation/core/branch-settings.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createbranchSettingsSchema), branchSettingsController.create)
  .get(authenticateToken, branchSettingsController.getAll)
;

router.route("/:id")
  .get(authenticateToken, branchSettingsController.getOne)
  .put(authenticateToken, validate(updatebranchSettingsSchema), branchSettingsController.update)
  .delete(authenticateToken, branchSettingsController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, branchSettingsController.restore)
;



export default router;
