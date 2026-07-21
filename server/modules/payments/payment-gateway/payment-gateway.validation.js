import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema, querySchema } from "../../../utils/joiFactory.js";
import PaymentGatewayModel from "./payment-gateway.model.js";

export const createPaymentGatewaySchema = createSchema(PaymentGatewayModel.schema);
export const updatePaymentGatewaySchema = updateSchema(PaymentGatewayModel.schema, ["updatedBy", "code"]);
export const paramsPaymentGatewaySchema = paramsSchema();
export const paramsPaymentGatewayIdsSchema = paramsIdsSchema();
export const queryPaymentGatewaySchema = querySchema();

// Not derived from createSchema — listAvailable is a GET-with-query-flags action, shaped
// differently from the generic list/query pattern (a single boolean flag, not filter/sort/paginate).
export const listAvailableQuerySchema = Joi.object({
  includeInactive: Joi.string().valid("true", "false").optional(),
});
