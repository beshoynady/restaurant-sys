import express from "express";
import attendanceSettingsController from "./attendance-settings.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import {
  createAttendanceSettingsSchema,
  updateAttendanceSettingsSchema,
  paramsAttendanceSettingsSchema,
  paramsAttendanceSettingsIdsSchema,
  queryAttendanceSettingsSchema,
} from "./attendance-settings.validation.js";

const router = express.Router();

router.route("/")
  .post(
    authenticateToken,
    authorize("AttendanceSettings", "create"),
    checkModuleEnabled("hr"),
    validate(createAttendanceSettingsSchema),
    attendanceSettingsController.create,
  )
  .get(
    authenticateToken,
    authorize("AttendanceSettings", "read"),
    checkModuleEnabled("hr"),
    validate(queryAttendanceSettingsSchema),
    attendanceSettingsController.getAll,
  );

// Policy resolution — branch override -> brand default -> hard default.
router.route("/resolve").get(
  authenticateToken,
  authorize("AttendanceSettings", "read"),
  checkModuleEnabled("hr"),
  attendanceSettingsController.resolve,
);

router.route("/:id")
  .get(
    authenticateToken,
    authorize("AttendanceSettings", "read"),
    checkModuleEnabled("hr"),
    validate(paramsAttendanceSettingsSchema),
    attendanceSettingsController.getOne,
  )
  .put(
    authenticateToken,
    authorize("AttendanceSettings", "update"),
    checkModuleEnabled("hr"),
    validate(updateAttendanceSettingsSchema),
    attendanceSettingsController.update,
  )
  .delete(
    authenticateToken,
    authorize("AttendanceSettings", "delete"),
    checkModuleEnabled("hr"),
    validate(paramsAttendanceSettingsSchema),
    attendanceSettingsController.hardDelete,
  );

router.route("/soft-delete/:id").patch(
  authenticateToken,
  authorize("AttendanceSettings", "delete"),
  checkModuleEnabled("hr"),
  validate(paramsAttendanceSettingsSchema),
  attendanceSettingsController.softDelete,
);

router.route("/restore/:id").patch(
  authenticateToken,
  authorize("AttendanceSettings", "update"),
  checkModuleEnabled("hr"),
  validate(paramsAttendanceSettingsSchema),
  attendanceSettingsController.restore,
);

// NOTE (BACKEND_FOUNDATION_TECH_DEBT.md FT-001): shadowed by "/:id" DELETE
// above (Express matches in registration order) — left broken for
// consistency with every other HR router pending the dedicated Foundation
// pass, not fixed here.
router.route("/bulk-delete").delete(
  authenticateToken,
  authorize("AttendanceSettings", "delete"),
  checkModuleEnabled("hr"),
  validate(paramsAttendanceSettingsIdsSchema),
  attendanceSettingsController.bulkHardDelete,
);

router.route("/bulk-soft-delete").patch(
  authenticateToken,
  authorize("AttendanceSettings", "delete"),
  checkModuleEnabled("hr"),
  validate(paramsAttendanceSettingsIdsSchema),
  attendanceSettingsController.bulkSoftDelete,
);

export default router;
