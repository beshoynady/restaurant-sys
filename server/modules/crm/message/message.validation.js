import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../../utils/joiFactory.js";
import MessageModel from "./message.model.js";

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
export const paramsMessageSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsMessageIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryMessageSchema = querySchema();