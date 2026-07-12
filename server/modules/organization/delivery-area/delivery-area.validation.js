import {
  createSchema,
  updateSchema,
  paramsSchema,
  paramsIdsSchema,
  querySchema,
} from "../../../utils/joiFactory.js";
import DeliveryAreaModel from "./delivery-area.model.js";

export const createDeliveryAreaSchema = createSchema(DeliveryAreaModel.schema);

export const updateDeliveryAreaSchema = updateSchema(DeliveryAreaModel.schema, ["updatedBy"]);

export const paramsDeliveryAreaSchema = paramsSchema();
export const paramsDeliveryAreaIdsSchema = paramsIdsSchema();
export const queryDeliveryAreaSchema = querySchema();
