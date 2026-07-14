import { createSchema, updateSchema, paramsSchema, paramsIdsSchema, querySchema } from "../../../utils/joiFactory.js";
import AuthenticationSettingsModel from "./authentication-settings.model.js";

export const createAuthenticationSettingsSchema = createSchema(AuthenticationSettingsModel.schema);
export const updateAuthenticationSettingsSchema = updateSchema(AuthenticationSettingsModel.schema, ["updatedBy"]);
export const paramsAuthenticationSettingsSchema = paramsSchema();
export const paramsAuthenticationSettingsIdsSchema = paramsIdsSchema();
export const queryAuthenticationSettingsSchema = querySchema();
