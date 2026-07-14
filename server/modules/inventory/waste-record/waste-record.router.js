import express from "express";
import wasteRecordController from "./waste-record.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import {
  createWasteRecordSchema,
  updateWasteRecordSchema,
  paramsWasteRecordSchema,
  paramsWasteRecordIdsSchema,
  queryWasteRecordSchema,
  transitionWasteRecordSchema,
} from "./waste-record.validation.js";

const router = express.Router();

router.route("/")
  .post(authenticateToken,
    authorize("WasteRecords", "create"),
    checkModuleEnabled("inventory"), validate(createWasteRecordSchema), wasteRecordController.create)
  .get(authenticateToken,
    authorize("WasteRecords", "read"),
    checkModuleEnabled("inventory"), validate(queryWasteRecordSchema), wasteRecordController.getAll)
;

router.route("/:id")
  .get(authenticateToken,
    authorize("WasteRecords", "read"),
    checkModuleEnabled("inventory"), validate(paramsWasteRecordSchema, "params"), wasteRecordController.getOne)
  .put(authenticateToken,
    authorize("WasteRecords", "update"),
    checkModuleEnabled("inventory"), validate(updateWasteRecordSchema), wasteRecordController.update)
  .delete(authenticateToken,
    authorize("WasteRecords", "delete"),
    checkModuleEnabled("inventory"), validate(paramsWasteRecordSchema, "params"), wasteRecordController.hardDelete)
;

router.route("/:id/transition")
  .post(authenticateToken,
    authorize("WasteRecords", "update"),
    checkModuleEnabled("inventory"), validate(paramsWasteRecordSchema, "params"), validate(transitionWasteRecordSchema), wasteRecordController.transition);

router.route("/bulk-delete")
  .delete(authenticateToken,
  authorize("WasteRecords", "delete"),
  checkModuleEnabled("inventory"), validate(paramsWasteRecordIdsSchema), wasteRecordController.bulkHardDelete);

export default router;
