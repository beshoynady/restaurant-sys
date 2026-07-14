import Joi from "joi";

export const instantiateTemplateSchema = Joi.object({
  templateKey: Joi.string().required(),
  scopeOverride: Joi.string().valid("ALL_BRANCHES", "ASSIGNED_BRANCHES").optional(),
});
