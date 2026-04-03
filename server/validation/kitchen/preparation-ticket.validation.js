import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../utils/joiFactory.js";
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
export const paramsPreparationTicketSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsPreparationTicketIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryPreparationTicketSchema = querySchema();