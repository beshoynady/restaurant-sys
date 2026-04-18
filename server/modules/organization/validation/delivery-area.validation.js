import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../utils/joiFactory.js";
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
export const paramsDeliveryAreaSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsDeliveryAreaIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryDeliveryAreaSchema = querySchema();