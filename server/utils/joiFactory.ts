import Joi from "joi";

/**
 * TS version of server/utils/joiFactory.js
 * Note: keep API compatible so existing routes can be migrated safely.
 */

export const objectId = () => Joi.string().pattern(/^[a-fA-F0-9]{24}$/);

export const createSchema = (schema: any) =>
  Joi.object(schema).required().unknown(false);

export const updateSchema = (schema: any, allowedKeys: string[] = []) => {
  const base = { ...schema };
  allowedKeys.forEach((k) => {
    if (!(k in base)) return;
  });

  // Make all keys optional for update except required constraints remain in schema.
  return Joi.object(base).min(1).required().unknown(false);
};

export const paramsSchema = () => Joi.object().unknown(false);

export const paramsIdsSchema = () =>
  Joi.object({
    ids: Joi.array().items(Joi.string().required()).min(1).required(),
  }).required();

export const querySchema = (shape: Record<string, any> = {}) =>
  Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).optional(),
    search: Joi.string().optional(),
    includeDeleted: Joi.boolean().optional(),
    sort: Joi.string().optional(),
    select: Joi.string().optional(),
    ...shape,
  }).unknown(false);
