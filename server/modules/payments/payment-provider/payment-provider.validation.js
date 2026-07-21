import Joi from "joi";
import { createSchema, updateSchema, paramsSchema, paramsIdsSchema, querySchema } from "../../../utils/joiFactory.js";
import PaymentProviderModel from "./payment-provider.model.js";

export const createPaymentProviderSchema = createSchema(PaymentProviderModel.schema);
export const updatePaymentProviderSchema = updateSchema(PaymentProviderModel.schema, ["updatedBy", "brand", "gateway"]);
export const paramsPaymentProviderSchema = paramsSchema();
export const paramsPaymentProviderIdsSchema = paramsIdsSchema();
export const queryPaymentProviderSchema = querySchema();

export const resolveCandidatesQuerySchema = Joi.object({
  channel: Joi.string()
    .valid("POS", "SELF_ORDERING", "QR", "WEBSITE", "MOBILE", "DELIVERY", "CALL_CENTER", "MARKETPLACE", "KIOSK", "ADMIN_DASHBOARD")
    .optional(),
});
