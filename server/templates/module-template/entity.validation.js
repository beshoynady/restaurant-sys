// TEMPLATE — Joi validation (ERP_DEVELOPMENT_STANDARD.md §1 "Validation"). Schema-level shape/type/
// enum only — cross-field business rules (XOR pairs, conditional-required) belong in the SERVICE
// layer's beforeCreate/beforeUpdate, not here (Mongoose/Joi can't express "required if X" cleanly).
import Joi from "joi";
import { objectId, multiLang, paramsSchema, paramsIdsSchema, querySchema } from "../../../utils/joiFactory.js";

export const createEntitySchema = Joi.object({
  branch: objectId(true).optional(), // TEMPLATE: .required() instead if branch is Pattern A (see entity.model.js)
  name: multiLang({ minlength: 2, maxlength: 100 }, true),
  // code: Joi.string().trim().uppercase().required(),
});

export const updateEntitySchema = Joi.object({
  name: multiLang({ minlength: 2, maxlength: 100 }, false),
  // Every field in lockedUpdateFields (entity.service.js) is silently stripped server-side even if
  // included here — no need to omit it from this schema, but don't rely on Joi to enforce the lock.
});

export const paramsEntitySchema = paramsSchema();
export const paramsEntityIdsSchema = paramsIdsSchema();
export const queryEntitySchema = querySchema();
