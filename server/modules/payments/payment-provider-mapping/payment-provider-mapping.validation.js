import { createSchema, updateSchema, paramsSchema, paramsIdsSchema, querySchema } from "../../../utils/joiFactory.js";
import PaymentProviderMappingModel from "./payment-provider-mapping.model.js";

export const createPaymentProviderMappingSchema = createSchema(PaymentProviderMappingModel.schema);
export const updatePaymentProviderMappingSchema = updateSchema(PaymentProviderMappingModel.schema, ["updatedBy", "brand", "paymentMethod", "provider"]);
export const paramsPaymentProviderMappingSchema = paramsSchema();
export const paramsPaymentProviderMappingIdsSchema = paramsIdsSchema();
export const queryPaymentProviderMappingSchema = querySchema();
