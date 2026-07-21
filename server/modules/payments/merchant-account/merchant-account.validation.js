import Joi from "joi";
import { objectId, paramsSchema, paramsIdsSchema, querySchema } from "../../../utils/joiFactory.js";

// Hand-written, not derived from createSchema(MerchantAccountModel.schema) — the model's stored
// shape (credentialValues Map, encrypted secretCredentials array) is NOT what a caller submits;
// callers submit a flat `credentials` object and the service splits/encrypts it (see
// merchant-account.service.js#_processCredentials). Validating against the stored schema would
// reject every legitimate request.
export const createMerchantAccountSchema = Joi.object({
  provider: objectId().required(),
  name: Joi.object().pattern(Joi.string(), Joi.string().trim().min(2).max(100)).required(),
  environment: Joi.string().valid("sandbox", "production").default("sandbox"),
  credentials: Joi.object().pattern(Joi.string(), Joi.any()).default({}),
  callbackUrls: Joi.object({
    successUrl: Joi.string().uri().allow("", null),
    failureUrl: Joi.string().uri().allow("", null),
  }).optional(),
  tokenLifetimeSeconds: Joi.number().integer().min(1).allow(null).optional(),
  timeoutSeconds: Joi.number().integer().min(1).max(300).optional(),
  maxRetries: Joi.number().integer().min(0).max(10).optional(),
  allowedBranches: Joi.array().items(objectId()).optional(),
  allowedCashRegisters: Joi.array().items(objectId()).optional(),
  allowedChannels: Joi.array().items(
    Joi.string().valid("POS", "SELF_ORDERING", "QR", "WEBSITE", "MOBILE", "DELIVERY", "CALL_CENTER", "MARKETPLACE", "KIOSK", "ADMIN_DASHBOARD"),
  ).optional(),
  ipWhitelist: Joi.array().items(Joi.string()).optional(),
  priority: Joi.number().integer().optional(),
  isActive: Joi.boolean().optional(),
  notes: Joi.string().trim().max(500).allow("", null).optional(),
});

export const updateMerchantAccountSchema = createMerchantAccountSchema.fork(
  ["provider", "name"],
  (schema) => schema.optional(),
);

export const paramsMerchantAccountSchema = paramsSchema();
export const paramsMerchantAccountIdsSchema = paramsIdsSchema();
export const queryMerchantAccountSchema = querySchema();
