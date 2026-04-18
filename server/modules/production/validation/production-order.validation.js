import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../utils/joiFactory.js";
import ProductionOrderModel from "../../models/production/production-order.model.js";

/* =========================
   Create Schema
========================= */
export const createProductionOrderSchema = createSchema(ProductionOrderModel.schema);

/* =========================
   Update Schema
========================= */
export const updateProductionOrderSchema = updateSchema(
  ProductionOrderModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const paramsProductionOrderSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsProductionOrderIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryProductionOrderSchema = querySchema();