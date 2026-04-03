import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../utils/joiFactory.js";
import BrandModel from "../../models/core/brand.model.js";

/* =========================
   Create Schema
========================= */
export const createBrandSchema = createSchema(BrandModel.schema);

/* =========================
   Update Schema
========================= */
export const updateBrandSchema = updateSchema(
  BrandModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const paramsBrandSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsBrandIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryBrandSchema = querySchema();