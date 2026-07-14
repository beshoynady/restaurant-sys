import Joi from "joi";
import { objectId } from "../../../utils/joiFactory.js";

export const paramsUserSecurityEventsSchema = Joi.object({
  userId: objectId().required(),
});

export const listSecurityEventsQuerySchema = Joi.object({
  eventType: Joi.string().optional(),
  success: Joi.boolean().optional(),
  limit: Joi.number().integer().min(1).max(500).optional(),
});
