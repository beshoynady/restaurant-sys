import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import MessageModel from "../../models/customers\message.model.js";

/* =========================
   Create Schema
========================= */
export const createMessageSchema = buildJoiSchema(MessageModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updateMessageSchema = (function() {
  const schema = buildJoiSchema(MessageModel.schema);
  return schema.fork(Object.keys(MessageModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const messageParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const messageQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});