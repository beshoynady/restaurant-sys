import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
import AttendanceRecordModel from "../../models/employees/attendance-record.model.js";

/* =========================
   Create Schema
========================= */
export const createAttendanceRecordSchema = createSchema(AttendanceRecordModel.schema);

/* =========================
   Update Schema
========================= */
export const updateAttendanceRecordSchema = updateSchema(
  AttendanceRecordModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const attendanceRecordParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const attendanceRecordQuerySchema = querySchema();