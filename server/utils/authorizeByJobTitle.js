// ADR-001 Phase 2 (Refund): the platform's job-title-based approval check, distinct from the
// RBAC-permission-based pattern `order.service.js#_hasCancelApprovalPermission` already
// establishes. `SalesReturnSettings.decisionBy`/`PreparationSettings.return.decisionBy` are both
// `[ObjectId] ref "JobTitle"` — authorizing an approver means checking whether the acting
// UserAccount's linked Employee holds one of those job titles, not an RBAC permission flag. No
// existing precedent in this codebase scopes this check any finer (branch/shift) — none is
// invented here.
import UserAccountModel from "../modules/iam/user-account/user-account.model.js";
import EmployeeModel from "../modules/hr/employee/employee.model.js";

/**
 * @param {string} userAccountId - the acting actorId (a UserAccount _id, matching every other
 *   actorId convention in this codebase — not an Employee _id).
 * @param {Array} decisionBy - the settings' `decisionBy` array of JobTitle ObjectIds.
 * @param {import("mongoose").ClientSession|null} session
 * @returns {Promise<boolean>}
 */
export async function isAuthorizedByJobTitle(userAccountId, decisionBy, session = null) {
  if (!Array.isArray(decisionBy) || decisionBy.length === 0) return false;
  if (!userAccountId) return false;

  const account = await UserAccountModel.findById(userAccountId).session(session).select("employee").lean();
  if (!account?.employee) return false;

  const employee = await EmployeeModel.findById(account.employee).session(session).select("jobTitle").lean();
  if (!employee?.jobTitle) return false;

  return decisionBy.some((jt) => String(jt) === String(employee.jobTitle));
}
