// Service layer (BACKEND_FOUNDATION.md §4.3): business orchestration only — every database
// operation delegates to a method inherited from (or added on) job-title.repository.js.
import throwError from "../../../utils/throwError.js";
import JobTitleRepository from "./job-title.repository.js";
import employeeService from "../employee/employee.service.js";

class JobTitleService extends JobTitleRepository {
  // Business rule: a job title with employees still assigned to it cannot
  // be deleted (soft or hard) — same integrity pattern already enforced on
  // Department. Previously unenforced entirely.
  async assertNoActiveEmployees(id, brandId) {
    const employeeCount = await employeeService.count({ brandId, filters: { jobTitle: id } });

    if (employeeCount > 0) {
      throwError(
        `Cannot delete this job title — ${employeeCount} employee(s) are still assigned to it`,
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

export default new JobTitleService();
