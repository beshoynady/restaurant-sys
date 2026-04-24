import Joi from "joi";
import {
  objectId,
  paramsSchema,
  paramsIdsSchema,
  querySchema,
} from "../../../utils/joiFactory.js";

/* =========================
   CREATE USER ACCOUNT
========================= */
export const createUserAccountSchema = {
  body: Joi.object({
    brand: objectId().required(),

    branch: objectId().allow(null),

    username: Joi.string().min(3).max(30).required(),

    email: Joi.string().email().allow(null, ""),

    phone: Joi.string().allow(null, ""),

    password: Joi.string().min(6).required(),

    confirmPassword: Joi.string()
      .valid(Joi.ref("password"))
      .required()
      .messages({
        "any.only": "Passwords do not match",
      }),

    employee: objectId().allow(null),

    role: objectId().required(),

    isActive: Joi.boolean(),

    twoFactorEnabled: Joi.boolean(),

    createdBy: objectId().allow(null),
  }).custom((value, helpers) => {
    // At least one contact method (email or phone) is required
    if (!value.email && !value.phone) {
      return helpers.error("any.custom", {
        message: "Either email or phone is required",
      });
    }

    return value;
  }),
};

/* =========================
   UPDATE USER ACCOUNT
========================= */
export const updateUserAccountSchema = {
  body: Joi.object({
    username: Joi.string().min(3).max(30),

    email: Joi.string().email().allow(null, ""),

    phone: Joi.string().allow(null, ""),

    password: Joi.string().min(6),

    employee: objectId().allow(null),

    role: objectId(),

    isActive: Joi.boolean(),

    branch: objectId().allow(null),

    updatedBy: objectId(),
  }),
};

/* =========================
   PARAMS
========================= */
export const paramsUserAccountSchema = paramsSchema();

/* bulk ids */
export const paramsUserAccountIdsSchema = paramsIdsSchema();

/* =========================
   QUERY
========================= */
export const queryUserAccountSchema = querySchema();