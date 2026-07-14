import Joi from "joi";
import { objectId, paramsSchema } from "../../../utils/joiFactory.js";

export const paramsDeviceSchema = paramsSchema();

export const blockDeviceSchema = Joi.object({
  reason: Joi.string().trim().max(300).optional(),
});

export const renameDeviceSchema = Joi.object({
  deviceName: Joi.string().trim().max(100).required(),
});

export const paramsUserDevicesSchema = Joi.object({
  userId: objectId().required(),
});
