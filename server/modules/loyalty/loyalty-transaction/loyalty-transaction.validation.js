import Joi from "joi";
import {
  objectId,
  paramsSchema,
  paramsIdsSchema,
  querySchema,
} from "../../../utils/joiFactory.js";

/* =========================
   🔹 Params
========================= */
export const paramsLoyaltyTransactionSchema = {
  params: paramsSchema(),
};

export const paramsLoyaltyTransactionIdsSchema = {
  body: paramsIdsSchema(),
};

/* =========================
   🔹 Query
========================= */
export const queryLoyaltyTransactionSchema = {
  query: querySchema(),
};

/* =========================
   🔹 Business actions
   -------------------------
   Cross-domain final audit finding: these three schemas were referenced by
   loyalty-transaction.router.js but never defined — the router could not
   have loaded (masked because it was never mounted). Scoped to exactly what
   loyalty-transaction.service.js#earn/redeem/adjust consume; `brand` is
   taken from req.user.brandId at the controller layer, not the body.
========================= */
export const earnPointsSchema = {
  body: Joi.object({
    branch: objectId().required(),
    customerLoyalty: objectId().required(),
    points: Joi.number().positive().required(),
    order: objectId(true),
  }),
};

export const redeemPointsSchema = {
  body: Joi.object({
    branch: objectId().required(),
    customerLoyalty: objectId().required(),
    points: Joi.number().positive().required(),
    reward: objectId(true),
    order: objectId(true),
  }),
};

export const adjustPointsSchema = {
  body: Joi.object({
    branch: objectId().required(),
    customerLoyalty: objectId().required(),
    points: Joi.number().invalid(0).required(),
    note: Joi.string().max(300).optional(),
  }),
};