import express from "express";
import assetMaintenanceController from "../../controllers/assets/asset-maintenance.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createassetMaintenanceSchema, updateassetMaintenanceSchema } from "../../validation/assets/asset-maintenance.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createassetMaintenanceSchema), assetMaintenanceController.create)
  .get(authenticateToken, assetMaintenanceController.getAll)
;

router.route("/:id")
  .get(authenticateToken, assetMaintenanceController.getOne)
  .put(authenticateToken, validate(updateassetMaintenanceSchema), assetMaintenanceController.update)
  .delete(authenticateToken, assetMaintenanceController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, assetMaintenanceController.restore)
;



export default router;
