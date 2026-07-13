// Service layer (BACKEND_FOUNDATION.md §4.3): business orchestration only — every database
// operation delegates to a method inherited from (or added on) shift.repository.js.
import throwError from "../../../utils/throwError.js";
import ShiftRepository from "./shift.repository.js";
import employeeService from "../employee/employee.service.js";

class ShiftService extends ShiftRepository {
  // Business rule: a shift with employees still assigned to it cannot be
  // deleted (soft or hard) — same integrity pattern already enforced on
  // Department and JobTitle. Previously unenforced entirely.
  async assertNoActiveEmployees(id, brandId) {
    const employeeCount = await employeeService.count({ brandId, filters: { shift: id } });

    if (employeeCount > 0) {
      throwError(
        `Cannot delete this shift — ${employeeCount} employee(s) are still assigned to it`,
        400,
      );
    }
  }

  async softDelete(opts) {
    await this.assertNoActiveEmployees(opts.id, opts.brandId);
    return super.softDelete(opts);
  }

  async hardDelete(opts) {
    await this.assertNoActiveEmployees(opts.id, opts.brandId);
    return super.hardDelete(opts);
  }
}

export default new ShiftService();
