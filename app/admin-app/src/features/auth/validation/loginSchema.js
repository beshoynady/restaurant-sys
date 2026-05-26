// features/auth/validation/loginSchema.js

import Joi from "joi";

/**
 * Login validation schema
 */
export const loginSchema = Joi.object({
  identifier: Joi.string()
    .required()
    .messages({
      "string.empty": "Username or email is required",
      "any.required": "Username or email is required",
    }),

  password: Joi.string()
    .min(6)
    .required()
    .messages({
      "string.empty": "Password is required",
      "string.min": "Password must be at least 6 characters",
      "any.required": "Password is required",
    }),
});