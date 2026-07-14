import bcrypt from "bcryptjs";
import UserAccountModel from "./user-account.model.js";
import EmployeeModel from "../../hr/employee/employee.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";
import throwError from "../../../utils/throwError.js";

class UserAccountService extends AdvancedService {
  constructor() {
    super(UserAccountModel, {
      brandScoped: true,
      enableSoftDelete: true,
      defaultPopulate: ["brand", "branch", "employee", "role"],
      searchableFields: ["username", "email", "phone"],
      defaultSort: { createdAt: -1 },
    });
  }

  /**
   * IASP Phase 5 — closes the UserAccount.branch / Employee.defaultBranch divergence at the
   * source (server/IDENTITY_MODEL.md §2.2): when an account is linked to an Employee, its
   * `branch` must actually be one the employee is assigned to (Employee.branches), and defaults
   * to the employee's HR-owned defaultBranch when not explicitly supplied — rather than accepting
   * whatever value the caller sends and letting it silently disagree with HR going forward.
   * Standalone accounts (no employee link — Owner/Admin) are untouched; they have no Employee
   * record to defer to.
   */
  async _resolveBranchAgainstEmployee(payload) {
    if (!payload.employee) return payload;

    const employee = await EmployeeModel.findById(payload.employee).select("defaultBranch branches");
    if (!employee) throwError("Linked employee not found.", 404);

    if (payload.branch) {
      const allowed = (employee.branches || []).some((b) => String(b) === String(payload.branch));
      if (!allowed) throwError("branch must be one of the linked employee's assigned branches.", 400);
    } else {
      payload.branch = employee.defaultBranch;
    }

    return payload;
  }

  // =========================
  // 🔐 CREATE USER (SECURED)
  // -------------------------
  // IAM Platform Redesign, corrected: this override previously called
  // `super.create(data, user)` — two positional arguments — against
  // `BaseRepository.create(opts)`, which destructures a single object
  // `{brandId, branchId, data, createdBy, session}`. Every field resolved to
  // `undefined`, so `UserAccountModel.create()` was called with an empty
  // payload and threw a Mongoose validation error on every call — creating a
  // staff/admin user account via `POST /user-accounts` was completely
  // broken. Fixed to use the same object-based calling convention as every
  // other service in this codebase, while preserving the original business
  // logic (brand assignment, normalization, password hashing, uniqueness
  // checks).
  // =========================
  async create({ brandId, branchId, data, createdBy }) {
    const payload = { ...data };

    payload.brand = brandId;

    if (payload.username) payload.username = payload.username.toLowerCase();
    if (payload.email) payload.email = payload.email.toLowerCase();

    payload.password = await bcrypt.hash(payload.password, 10);

    if (payload.email) {
      const exists = await this.model.findOne({ brand: brandId, email: payload.email });
      if (exists) throwError("Email already exists", 400);
    }

    if (payload.phone) {
      const exists = await this.model.findOne({ brand: brandId, phone: payload.phone });
      if (exists) throwError("Phone already exists", 400);
    }

    await this._resolveBranchAgainstEmployee(payload);

    return super.create({ brandId, branchId, data: payload, createdBy });
  }

  // =========================
  // ✏️ UPDATE
  // -------------------------
  // Same corrected calling convention as create() above.
  // =========================
  async update({ id, brandId, branchId, data, updatedBy }) {
    const existing = await this.model.findOne({ _id: id, brand: brandId });
    if (!existing) throwError("User not found", 404);

    const payload = { ...data };
    if (payload.password) {
      payload.password = await bcrypt.hash(payload.password, 10);
    }

    // Only re-validate branch-against-employee when either is actually changing — an unrelated
    // update (e.g. renaming the account) shouldn't pay for an Employee lookup it doesn't need.
    const effectiveEmployee = payload.employee !== undefined ? payload.employee : existing.employee;
    if (effectiveEmployee && (payload.branch !== undefined || payload.employee !== undefined)) {
      payload.employee = effectiveEmployee;
      await this._resolveBranchAgainstEmployee(payload);
    }

    return super.update({ id, brandId, branchId, data: payload, updatedBy });
  }

  // =========================
  // 🗑️ DELETE SAFETY
  // -------------------------
  // Same corrected calling convention. The self-delete guard uses
  // `deletedBy`/`hardDeletedBy` (the acting user) — BaseController's default
  // `hardDelete` handler doesn't pass an actor id at all (only `softDelete`
  // does), so `user-account.controller.js` now explicitly overrides
  // `hardDelete` to supply it; without that, this guard would previously
  // have thrown a TypeError reading `.toString()` off `undefined` on every
  // call.
  // =========================
  async hardDelete({ id, brandId, branchId, actorId }) {
    if (actorId && actorId.toString() === id.toString()) {
      throwError("You cannot delete yourself", 400);
    }
    return super.hardDelete({ id, brandId, branchId });
  }

  async softDelete({ id, brandId, branchId, deletedBy }) {
    if (deletedBy && deletedBy.toString() === id.toString()) {
      throwError("You cannot delete yourself", 400);
    }
    return super.softDelete({ id, brandId, branchId, deletedBy });
  }
}

export default new UserAccountService();
