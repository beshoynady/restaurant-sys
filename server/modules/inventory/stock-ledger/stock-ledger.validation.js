import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../utils/joiFactory.js";
import StockLedgerModel from "./stock-ledger.model.js";

/* =========================
   Create Schema
========================= */
export const createStockLedgerSchema = createSchema(StockLedgerModel.schema);

/* =========================
   Update Schema
========================= */
export const updateStockLedgerSchema = updateSchema(
  StockLedgerModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const paramsStockLedgerSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsStockLedgerIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryStockLedgerSchema = querySchema();