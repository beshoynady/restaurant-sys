import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
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
export const productionOrderParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const productionOrderQuerySchema = querySchema();