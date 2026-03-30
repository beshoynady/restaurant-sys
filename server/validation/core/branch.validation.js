import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import BranchModel from "../../models/core\branch.model.js";

/* =========================
   Create Schema
========================= */
export const createBranchSchema = buildJoiSchema(BranchModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updateBranchSchema = (function() {
  const schema = buildJoiSchema(BranchModel.schema);
  return schema.fork(Object.keys(BranchModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const branchParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const branchQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});