import { ObjectSchema } from "joi";
import joiFactoryJs from "../../../utils/joiFactory.js";
import DeliveryAreaModel from "./delivery-area.model.js";

const { createSchema, updateSchema, paramsSchema, paramsIdsSchema, querySchema } =
  joiFactoryJs as {
    createSchema: (schema: unknown) => ObjectSchema;
    updateSchema: (schema: unknown, exclude?: string[]) => ObjectSchema;
    paramsSchema: () => ObjectSchema;
    paramsIdsSchema: () => ObjectSchema;
    querySchema: () => ObjectSchema;
  };

export const createDeliveryAreaSchema: ObjectSchema = createSchema(DeliveryAreaModel.schema);

export const updateDeliveryAreaSchema: ObjectSchema = updateSchema(DeliveryAreaModel.schema, [
  "updatedBy",
]);

export const paramsDeliveryAreaSchema: ObjectSchema = paramsSchema();
export const paramsDeliveryAreaIdsSchema: ObjectSchema = paramsIdsSchema();
export const queryDeliveryAreaSchema: ObjectSchema = querySchema();
