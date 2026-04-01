import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
import PreparationTicketModel from "../../models/kitchen/preparation-ticket.model.js";

/* =========================
   Create Schema
========================= */
export const createPreparationTicketSchema = createSchema(PreparationTicketModel.schema);

/* =========================
   Update Schema
========================= */
export const updatePreparationTicketSchema = updateSchema(
  PreparationTicketModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const preparationTicketParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const preparationTicketQuerySchema = querySchema();