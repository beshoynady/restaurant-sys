import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import NotificationSettingsModel from "../../models/system/notification-settings.model.js";

/* =========================
   Create Schema
========================= */
export const createNotificationSettingsSchema = buildJoiSchema(NotificationSettingsModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updateNotificationSettingsSchema = (function() {
  const schema = buildJoiSchema(NotificationSettingsModel.schema);
  return schema.fork(Object.keys(NotificationSettingsModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const notificationSettingsParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const notificationSettingsQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});