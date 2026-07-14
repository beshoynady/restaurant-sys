import express from "express";
import fryerOilLogController from "./fryer-oil-log.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import {
  createFryerOilLogSchema,
  updateFryerOilLogSchema,
  paramsFryerOilLogSchema,
  paramsFryerOilLogIdsSchema,
  queryFryerOilLogSchema,
  installFryerOilLogSchema,
  logQualityCheckFryerOilLogSchema,
  discardFryerOilLogSchema,
  transitionFryerOilLogSchema,
} from "./fryer-oil-log.validation.js";

const router = express.Router();

router.route("/")
  .post(authenticateToken,
    authorize("FryerOilLogs", "create"),
    checkModuleEnabled("inventory"), validate(createFryerOilLogSchema), fryerOilLogController.create)
  .get(authenticateToken,
    authorize("FryerOilLogs", "read"),
    checkModuleEnabled("inventory"), validate(queryFryerOilLogSchema), fryerOilLogController.getAll)
;

router.route("/:id")
  .get(authenticateToken,
    authorize("FryerOilLogs", "read"),
    checkModuleEnabled("inventory"), validate(paramsFryerOilLogSchema, "params"), fryerOilLogController.getOne)
  .put(authenticateToken,
    authorize("FryerOilLogs", "update"),
    checkModuleEnabled("inventory"), validate(updateFryerOilLogSchema), fryerOilLogController.update)
  .delete(authenticateToken,
    authorize("FryerOilLogs", "delete"),
    checkModuleEnabled("inventory"), validate(paramsFryerOilLogSchema, "params"), fryerOilLogController.hardDelete)
;

router.route("/:id/install")
  .post(authenticateToken,
    authorize("FryerOilLogs", "update"),
    checkModuleEnabled("inventory"), validate(paramsFryerOilLogSchema, "params"), validate(installFryerOilLogSchema), fryerOilLogController.install);

router.route("/:id/quality-check")
  .post(authenticateToken,
    authorize("FryerOilLogs", "update"),
    checkModuleEnabled("inventory"), validate(paramsFryerOilLogSchema, "params"), validate(logQualityCheckFryerOilLogSchema), fryerOilLogController.logQualityCheck);

router.route("/:id/discard")
  .post(authenticateToken,
    authorize("FryerOilLogs", "update"),
    checkModuleEnabled("inventory"), validate(paramsFryerOilLogSchema, "params"), validate(discardFryerOilLogSchema), fryerOilLogController.discard);

router.route("/:id/transition")
  .post(authenticateToken,
    authorize("FryerOilLogs", "update"),
    checkModuleEnabled("inventory"), validate(paramsFryerOilLogSchema, "params"), validate(transitionFryerOilLogSchema), fryerOilLogController.transition);

router.route("/bulk-delete")
  .delete(authenticateToken,
  authorize("FryerOilLogs", "delete"),
  checkModuleEnabled("inventory"), validate(paramsFryerOilLogIdsSchema), fryerOilLogController.bulkHardDelete);

export default router;
