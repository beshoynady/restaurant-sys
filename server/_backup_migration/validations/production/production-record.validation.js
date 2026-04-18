import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../utils/joiFactory.js";
import ProductionRecordModel from "../../models/production/production-record.model.js";

/* =========================
   Create Schema
========================= */
export const createProductionRecordSchema = createSchema(ProductionRecordModel.schema);

/* =========================
   Update Schema
========================= */
export const updateProductionRecordSchema = updateSchema(
  ProductionRecordModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const paramsProductionRecordSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsProductionRecordIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryProductionRecordSchema = querySchema();