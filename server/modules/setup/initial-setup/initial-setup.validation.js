import Joi from "joi";

export const setupSchema = Joi.object({
  brandName: Joi.object().pattern(
    Joi.string().valid("EN", "AR").required(),
    Joi.string().min(3).max(50).required(),
  ).required(),

  branchName: Joi.object().pattern(
    Joi.string().valid("EN", "AR").required(),
    Joi.string().min(3).max(50).required(),
  ).required(),


  owner: Joi.object({
    username: Joi.string().regex(/^[A-Za-z0-9]+$/).required(),
    password: Joi.string().min(6).required(),
  }).required(),
});

export default setupSchema;