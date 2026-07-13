// Service layer (BACKEND_FOUNDATION.md §4.3): business orchestration only — every database
// operation delegates to a method inherited from (or added on) employee.repository.js.
import throwError from "../../../utils/throwError.js";
import EmployeeRepository from "./employee.repository.js";
import employeeSettingsService from "../employee-settings/employee-settings.service.js";

class EmployeeService extends EmployeeRepository {
  // Business rule: an Employee's jobTitle must belong to the same
  // department as the Employee itself — the model has no schema-level way
  // to enforce "ref A's own field must match sibling field B", so this is
  // checked here instead. Previously unenforced entirely (confirmed by
  // reading the module — no service override existed at all).
  async assertJobTitleMatchesDepartment({ jobTitle, department }) {
    if (!jobTitle || !department) return;

    const jobTitleDoc = await this.findDepartmentOfJobTitle(jobTitle);

    if (!jobTitleDoc) {
      throwError("Job title not found", 404);
    }

    if (String(jobTitleDoc.department) !== String(department)) {
      throwError("Job title does not belong to the selected department", 400);
    }
  }

  async beforeCreate(data) {
    // HD-003 + requiredFields + employeeCode auto-generation — see
    // employee-settings.service.js#applyToNewEmployee. Runs before the
    // jobTitle/department check below so a rejected department policy
    // (requiredFields) fails before any employeeCode sequence gets consumed.
    await employeeSettingsService.applyToNewEmployee(data);

    await this.assertJobTitleMatchesDepartment({
      jobTitle: data.jobTitle,
      department: data.department,
    });

    return data;
  }

  async beforeUpdate(data) {
    // Only re-checked when a caller supplies BOTH fields in the same
    // update payload — a single-field change (e.g. jobTitle alone) can't
    // be validated here without an extra DB read for the employee's
    // current department, which BaseRepository.update doesn't provide to
    // this hook. Documented rather than silently partial.
    if (data.jobTitle && data.department) {
      await this.assertJobTitleMatchesDepartment({
        jobTitle: data.jobTitle,
        department: data.department,
      });
    }

    return data;
  }
}

export default new EmployeeService();
