import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
import PreparationSectionModel from "../../models/kitchen/preparation-section.model.js";

/* =========================
   Create Schema
========================= */
export const createPreparationSectionSchema = createSchema(PreparationSectionModel.schema);

/* =========================
   Update Schema
========================= */
export const updatePreparationSectionSchema = updateSchema(
  PreparationSectionModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const preparationSectionParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const preparationSectionQuerySchema = querySchema();