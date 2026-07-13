// Repository layer (BACKEND_FOUNDATION.md §4.3): owns ALL database access for JobTitle —
// generic CRUD (inherited from BaseRepository) plus custom queries this module needs.
// Previously this module had no repository file at all — job-title.service.js instantiated
// BaseRepository directly, violating the mandatory Repository Pattern.
import mongoose from "mongoose";
import BaseRepository from "../../../utils/BaseRepository.js";
import { multilingualSearchableFields } from "../../../utils/multilingualSearch.js";
import JobTitleModel from "./job-title.model.js";

class JobTitleRepository extends BaseRepository {
  constructor() {
    super(JobTitleModel, {
      brandScoped: true,
      enableSoftDelete: true,
      defaultPopulate: ["brand", "branch", "department", "costCenter", "createdBy", "updatedBy", "deletedBy"],
      searchableFields: ["code", ...multilingualSearchableFields("name")],
      defaultSort: { createdAt: -1 },
    });
  }

  /** "Positions per department" — a common admin dashboard/reporting need. */
  async countActiveByDepartment(brandId) {
    return this.model.aggregate([
      {
        $match: {
          brand: new mongoose.Types.ObjectId(brandId),
          status: "active",
          isDeleted: false,
        },
      },
      { $group: { _id: "$department", count: { $sum: 1 } } },
      { $project: { department: "$_id", count: 1, _id: 0 } },
    ]);
  }
}

export default JobTitleRepository;
