import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import JournalEntryModel from "../../models/accounting\journal-entry.model.js";

/* =========================
   Create Schema
========================= */
export const createJournalEntrySchema = buildJoiSchema(JournalEntryModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updateJournalEntrySchema = (function() {
  const schema = buildJoiSchema(JournalEntryModel.schema);
  return schema.fork(Object.keys(JournalEntryModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const journalEntryParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const journalEntryQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});