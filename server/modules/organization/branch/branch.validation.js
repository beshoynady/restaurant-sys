import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../../utils/joiFactory.js";
import BranchModel from "./branch.model.js";

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
export const paramsBranchSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsBranchIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryBranchSchema = querySchema();