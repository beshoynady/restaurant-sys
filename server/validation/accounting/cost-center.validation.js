import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import CostCenterModel from "../../models/accounting/cost-center.model.js";

/* =========================
   Create Schema
========================= */
export const createCostCenterSchema = buildJoiSchema(CostCenterModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updateCostCenterSchema = (function() {
  const schema = buildJoiSchema(CostCenterModel.schema);
  return schema.fork(Object.keys(CostCenterModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const costCenterParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const costCenterQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});