import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../../utils/joiFactory.js";
import AttendanceRecordModel from "./attendance-record.model.js";

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
export const paramsAttendanceRecordSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsAttendanceRecordIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryAttendanceRecordSchema = querySchema();