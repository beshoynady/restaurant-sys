import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../utils/joiFactory.js";
import NotificationSettingsModel from "../../models/system/notification-settings.model.js";

/* =========================
   Create Schema
========================= */
export const createNotificationSettingsSchema = createSchema(NotificationSettingsModel.schema);

/* =========================
   Update Schema
========================= */
export const updateNotificationSettingsSchema = updateSchema(
  NotificationSettingsModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const paramsNotificationSettingsSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsNotificationSettingsIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryNotificationSettingsSchema = querySchema();