// Repository layer (BACKEND_FOUNDATION.md §4.3): owns ALL database access for Department —
// generic CRUD (inherited from BaseRepository) plus custom queries this module needs.
// Previously this module had no repository file at all — department.service.js instantiated
// BaseRepository directly, violating the mandatory Repository Pattern.
import BaseRepository from "../../../utils/BaseRepository.js";
import { multilingualSearchableFields } from "../../../utils/multilingualSearch.js";
import DepartmentModel from "./department.model.js";

class DepartmentRepository extends BaseRepository {
  constructor() {
    super(DepartmentModel, {
      brandScoped: true,
      enableSoftDelete: true,
      defaultPopulate: ["brand", "parentDepartment", "createdBy", "updatedBy", "deletedBy"],
      searchableFields: ["code", ...multilingualSearchableFields("name")],
      defaultSort: { createdAt: -1 },
    });
  }

  /** Walks the parentDepartment chain starting at `startId`, returning every ancestor id in order. */
  async findAncestorChain(startId) {
    const ancestors = [];
    let currentId = startId;

    // A malformed/cyclic chain in existing data must not hang this forever —
    // no brand plausibly has more than a few hundred departments.
    for (let i = 0; i < 500 && currentId; i++) {
      const doc = await this.model.findById(currentId).select("parentDepartment").lean();
      if (!doc || !doc.parentDepartment) break;
      ancestors.push(String(doc.parentDepartment));
      currentId = doc.parentDepartment;
    }

    return ancestors;
  }
}

export default DepartmentRepository;
