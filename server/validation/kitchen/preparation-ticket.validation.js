import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import PreparationTicketModel from "../../models/kitchen/preparation-ticket.model.js";

/* =========================
   Create Schema
========================= */
export const createPreparationTicketSchema = buildJoiSchema(PreparationTicketModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updatePreparationTicketSchema = (function() {
  const schema = buildJoiSchema(PreparationTicketModel.schema);
  return schema.fork(Object.keys(PreparationTicketModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const preparationTicketParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const preparationTicketQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});