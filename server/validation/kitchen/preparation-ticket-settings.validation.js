import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../utils/joiFactory.js";
import PreparationTicketSettingsModel from "../../models/kitchen/preparation-ticket-settings.model.js";

/* =========================
   Create Schema
========================= */
export const createPreparationTicketSettingsSchema = createSchema(PreparationTicketSettingsModel.schema);

/* =========================
   Update Schema
========================= */
export const updatePreparationTicketSettingsSchema = updateSchema(
  PreparationTicketSettingsModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const paramsPreparationTicketSettingsSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsPreparationTicketSettingsIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryPreparationTicketSettingsSchema = querySchema();