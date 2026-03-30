import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import JobTitleModel from "../../models/employees/job-title.model.js";

/* =========================
   Create Schema
========================= */
export const createJobTitleSchema = buildJoiSchema(JobTitleModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updateJobTitleSchema = (function() {
  const schema = buildJoiSchema(JobTitleModel.schema);
  return schema.fork(Object.keys(JobTitleModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const jobTitleParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const jobTitleQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});