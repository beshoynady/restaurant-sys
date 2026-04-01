import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
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
export const productionRecordParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const productionRecordQuerySchema = querySchema();