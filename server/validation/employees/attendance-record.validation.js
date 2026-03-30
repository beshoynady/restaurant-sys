import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import AttendanceRecordModel from "../../models/employees/attendance-record.model.js";

/* =========================
   Create Schema
========================= */
export const createAttendanceRecordSchema = buildJoiSchema(AttendanceRecordModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updateAttendanceRecordSchema = (function() {
  const schema = buildJoiSchema(AttendanceRecordModel.schema);
  return schema.fork(Object.keys(AttendanceRecordModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const attendanceRecordParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const attendanceRecordQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});