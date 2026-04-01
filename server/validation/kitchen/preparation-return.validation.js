import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
import PreparationReturnModel from "../../models/kitchen/preparation-return.model.js";

/* =========================
   Create Schema
========================= */
export const createPreparationReturnSchema = createSchema(PreparationReturnModel.schema);

/* =========================
   Update Schema
========================= */
export const updatePreparationReturnSchema = updateSchema(
  PreparationReturnModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const preparationReturnParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const preparationReturnQuerySchema = querySchema();