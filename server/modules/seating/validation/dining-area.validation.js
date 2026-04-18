import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../utils/joiFactory.js";
import DiningAreaModel from "../../models/seating/dining-area.model.js";

/* =========================
   Create Schema
========================= */
export const createDiningAreaSchema = createSchema(DiningAreaModel.schema);

/* =========================
   Update Schema
========================= */
export const updateDiningAreaSchema = updateSchema(
  DiningAreaModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const paramsDiningAreaSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsDiningAreaIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryDiningAreaSchema = querySchema();