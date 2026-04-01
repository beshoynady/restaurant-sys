import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
import BranchModel from "../../models/core/branch.model.js";

/* =========================
   Create Schema
========================= */
export const createBranchSchema = createSchema(BranchModel.schema);

/* =========================
   Update Schema
========================= */
export const updateBranchSchema = updateSchema(
  BranchModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const branchParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const branchQuerySchema = querySchema();