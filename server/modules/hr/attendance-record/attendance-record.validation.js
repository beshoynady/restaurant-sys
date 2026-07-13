import { createSchema, updateSchema, paramsSchema, paramsIdsSchema, querySchema } from "../../../utils/joiFactory.js";
import AttendanceRecordModel from "./attendance-record.model.js";

// isLate/lateMinutes/leftEarly/earlyMinutes/isOvertime/overtimeMinutes/
// totalWorkedMinutes/totalAbsentMinutes are server-computed only (HD-008 —
// see attendance-record.service.js) — excluded here so a client attempting
// to set them directly has the field silently dropped (joiFactory's
// `stripUnknown: true`) rather than accepted and then immediately
// overwritten, which would be misleading if the client inspects its own
// validated payload.
const COMPUTED_FIELDS = [
  "isLate",
  "lateMinutes",
  "leftEarly",
  "earlyMinutes",
  "isOvertime",
  "overtimeMinutes",
  "totalWorkedMinutes",
  "totalAbsentMinutes",
];

/* =========================
   Create Schema
========================= */
export const createAttendanceRecordSchema = createSchema(AttendanceRecordModel.schema, {
  exclude: COMPUTED_FIELDS,
});

/* =========================
   Update Schema
========================= */
// Previously passed as a bare array (`["updatedBy"]`) instead of
// `{exclude: [...]}` — silently a no-op due to how the options object is
// spread in joiFactory.updateSchema (harmless since `updatedBy` is already
// excluded by joiFactory's own default list, but corrected for clarity —
// same fix already applied across this HR rollout).
export const updateAttendanceRecordSchema = updateSchema(AttendanceRecordModel.schema, {
  exclude: ["updatedBy", ...COMPUTED_FIELDS],
});

/* =========================
   Params Schema
========================= */
export const paramsAttendanceRecordSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsAttendanceRecordIdsSchema = paramsIdsSchema();

/* =========================
   Query Schema
========================= */
export const queryAttendanceRecordSchema = querySchema({});
