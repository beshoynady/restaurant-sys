import express from "express";
import manualConsumptionController from "./manual-consumption.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import {
  createManualConsumptionSchema,
  updateManualConsumptionSchema,
  paramsManualConsumptionSchema,
  paramsManualConsumptionIdsSchema,
  queryManualConsumptionSchema,
  transitionManualConsumptionSchema,
} from "./manual-consumption.validation.js";

const router = express.Router();

router.route("/")
  .post(authenticateToken,
    authorize("ManualConsumptions", "create"),
    checkModuleEnabled("inventory"), validate(createManualConsumptionSchema), manualConsumptionController.create)
  .get(authenticateToken,
    authorize("ManualConsumptions", "read"),
    checkModuleEnabled("inventory"), validate(queryManualConsumptionSchema), manualConsumptionController.getAll)
;

router.route("/:id")
  .get(authenticateToken,
    authorize("ManualConsumptions", "read"),
    checkModuleEnabled("inventory"), validate(paramsManualConsumptionSchema, "params"), manualConsumptionController.getOne)
  .put(authenticateToken,
    authorize("ManualConsumptions", "update"),
    checkModuleEnabled("inventory"), validate(updateManualConsumptionSchema), manualConsumptionController.update)
  .delete(authenticateToken,
    authorize("ManualConsumptions", "delete"),
    checkModuleEnabled("inventory"), validate(paramsManualConsumptionSchema, "params"), manualConsumptionController.hardDelete)
;

router.route("/:id/transition")
  .post(authenticateToken,
    authorize("ManualConsumptions", "update"),
    checkModuleEnabled("inventory"), validate(paramsManualConsumptionSchema, "params"), validate(transitionManualConsumptionSchema), manualConsumptionController.transition);

router.route("/bulk-delete")
  .delete(authenticateToken,
  authorize("ManualConsumptions", "delete"),
  checkModuleEnabled("inventory"), validate(paramsManualConsumptionIdsSchema), manualConsumptionController.bulkHardDelete);

export default router;
