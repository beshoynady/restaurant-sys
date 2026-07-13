import { createSchema, updateSchema, paramsSchema, paramsIdsSchema, querySchema } from "../../../utils/joiFactory.js";
import PayrollSettingsModel from "./payroll-settings.model.js";

// Every nested group here (cycle/defaults/automation/approvalWorkflow/
// lockPolicy/roundingPolicy/taxDefaults/accountingIntegration) is a plain
// nested object, not a DocumentArray or Map — joiFactory's generic
// dotted-path reassembly already handles these correctly with no manual
// override needed (same as EmployeeFinancialProfile's validation.js).

export const createPayrollSettingsSchema = createSchema(PayrollSettingsModel.schema);

export const updatePayrollSettingsSchema = updateSchema(PayrollSettingsModel.schema, {
  exclude: ["updatedBy"],
});

export const paramsPayrollSettingsSchema = paramsSchema();
export const paramsPayrollSettingsIdsSchema = paramsIdsSchema();
export const queryPayrollSettingsSchema = querySchema();
