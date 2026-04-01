import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
import StockLedgerModel from "../../models/inventory/stock-ledger.model.js";

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
export const stockLedgerParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const stockLedgerQuerySchema = querySchema();