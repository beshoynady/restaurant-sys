import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
import CostCenterModel from "../../models/accounting/cost-center.model.js";

/* =========================
   Create Schema
========================= */
export const createCostCenterSchema = createSchema(CostCenterModel.schema);

/* =========================
   Update Schema
========================= */
export const updateCostCenterSchema = updateSchema(
  CostCenterModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const costCenterParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const costCenterQuerySchema = querySchema();