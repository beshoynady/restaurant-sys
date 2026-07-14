import Joi from "joi";
import { objectId, paramsSchema } from "../../../utils/joiFactory.js";

export const issueCredentialSchema = Joi.object({
  principal: objectId().required(),
  principalType: Joi.string().valid("UserAccount").default("UserAccount"),
  type: Joi.string().valid("PIN", "BARCODE", "QR").required(),
  value: Joi.string().required(),
  branch: objectId(true).optional(),
  expiresAt: Joi.date().optional(),
});

export const paramsAuthCredentialSchema = paramsSchema();

export const paramsPrincipalSchema = Joi.object({
  principalId: objectId().required(),
});
