import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
import MessageModel from "../../models/customers/message.model.js";

/* =========================
   Create Schema
========================= */
export const createMessageSchema = createSchema(MessageModel.schema);

/* =========================
   Update Schema
========================= */
export const updateMessageSchema = updateSchema(
  MessageModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const messageParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const messageQuerySchema = querySchema();