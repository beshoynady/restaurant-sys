import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../../utils/joiFactory.js";
import CostCenterModel from "./cost-center.model.js";

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
export const paramsCostCenterSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsCostCenterIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryCostCenterSchema = querySchema();