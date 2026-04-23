import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../../utils/joiFactory.js";
import PreparationSectionModel from "./preparation-section.model.js";

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
export const paramsPreparationSectionSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsPreparationSectionIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryPreparationSectionSchema = querySchema();