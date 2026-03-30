import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import PreparationTicketSettingsModel from "../../models/kitchen\preparation-ticket-settings.model.js";

/* =========================
   Create Schema
========================= */
export const createPreparationTicketSettingsSchema = buildJoiSchema(PreparationTicketSettingsModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updatePreparationTicketSettingsSchema = (function() {
  const schema = buildJoiSchema(PreparationTicketSettingsModel.schema);
  return schema.fork(Object.keys(PreparationTicketSettingsModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const preparationTicketSettingsParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const preparationTicketSettingsQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});