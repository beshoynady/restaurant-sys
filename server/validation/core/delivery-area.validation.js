import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
import DeliveryAreaModel from "../../models/core/delivery-area.model.js";

/* =========================
   Create Schema
========================= */
export const createDeliveryAreaSchema = createSchema(DeliveryAreaModel.schema);

/* =========================
   Update Schema
========================= */
export const updateDeliveryAreaSchema = updateSchema(
  DeliveryAreaModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const deliveryAreaParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const deliveryAreaQuerySchema = querySchema();