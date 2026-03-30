import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import TaxConfigModel from "../../models/system/tax-config.model.js";

/* =========================
   Create Schema
========================= */
export const createTaxConfigSchema = buildJoiSchema(TaxConfigModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updateTaxConfigSchema = (function() {
  const schema = buildJoiSchema(TaxConfigModel.schema);
  return schema.fork(Object.keys(TaxConfigModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const taxConfigParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const taxConfigQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});