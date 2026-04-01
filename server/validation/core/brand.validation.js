import Joi from "joi";
import {
  objectId,
  createSchema,
  updateSchema,
  paramsSchema,
  querySchema,
} from "../../utils/joiFactory.js";
import BrandModel from "../../models/core/brand.model.js";

/* =========================
   Create Schema
========================= */
export const createBrandSchema = createSchema(BrandModel.schema);

/* =========================
   Update Schema
========================= */
export const updateBrandSchema = updateSchema(BrandModel.schema, ["updatedBy"]);

/* =========================
   Params Schema
========================= */
export const brandParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const brandQuerySchema = querySchema();
