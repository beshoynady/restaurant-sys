// Service layer (BACKEND_FOUNDATION.md §4.3): business orchestration only — every database
// operation delegates to a method inherited from (or added on) department.repository.js.
import throwError from "../../../utils/throwError.js";
import DepartmentRepository from "./department.repository.js";
import employeeService from "../employee/employee.service.js";

class DepartmentService extends DepartmentRepository {
  // Business rule: a department cannot become its own ancestor. Previously
  // entirely unenforced — `parentDepartment` self-reference had no guard at
  // all, so a cyclic chain was possible and would hang any future code that
  // walks it (org-chart, breadcrumb).
  async assertNoCycle({ id, parentDepartment }) {
    if (!parentDepartment) return;

    if (id && String(parentDepartment) === String(id)) {
      throwError("A department cannot be its own parent", 400);
    }

    if (id) {
      const ancestors = await this.findAncestorChain(parentDepartment);
      if (ancestors.includes(String(id))) {
        throwError("This would create a circular department hierarchy", 400);
      }
    }
  }

  // Business rule: a department with employees still assigned to it cannot
  // be deleted (soft or hard) — previously unenforced, leaving Employee
  // documents with a dangling `department` reference.
  async assertNoActiveEmployees(id, brandId) {
    const employeeCount = await employeeService.count({ brandId, filters: { department: id } });

    if (employeeCount > 0) {
      throwError(
        `Cannot delete this department — ${employeeCount} employee(s) are still assigned to it`,
        400,
      );
    }
  }

  async beforeCreate(data) {
    await this.assertNoCycle({ parentDepartment: data.parentDepartment });
    return data;
  }

  async beforeUpdate(data) {
    // No employee/department id is available in this hook (BaseRepository.
    // update doesn't pass it through) — the cycle check here only catches
    // the "set as own parent" case reliably; the deeper "creates a cycle
    // via an intermediate ancestor" case is caught in `update()` below,
    // which does have `id`.
    return data;
  }

  async update(opts) {
    if (opts.data?.parentDepartment) {
      await this.assertNoCycle({ id: opts.id, parentDepartment: opts.data.parentDepartment });
    }

    return super.update(opts);
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

export default new DepartmentService();
