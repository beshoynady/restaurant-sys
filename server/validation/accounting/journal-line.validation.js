import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import JournalLineModel from "../../models/accounting\journal-line.model.js";

/* =========================
   Create Schema
========================= */
export const createJournalLineSchema = buildJoiSchema(JournalLineModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updateJournalLineSchema = (function() {
  const schema = buildJoiSchema(JournalLineModel.schema);
  return schema.fork(Object.keys(JournalLineModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const journalLineParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const journalLineQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});