// Repository layer (BACKEND_FOUNDATION.md §4.3): database access ONLY for Branch — CRUD, queries,
// pagination/geo/search query-building, and scoped-write primitives. Business invariants (e.g.
// "only one main branch per brand") are NOT decided here — they're checked in branch.service.js,
// which composes the primitives below (`findMainBranch`, `generateSlugFor`, `insertBranch`,
// `updateBranchDocument`, `unsetAllMainBranches`). The one exception, consistent with how
// BaseRepository's own inherited methods already behave, is a plain "not found" 404 — that's
// data-integrity plumbing, not a business rule, so it stays alongside the query that discovers it.
import BaseRepository from "../../../utils/BaseRepository.js";
import throwError from "../../../utils/throwError.js";
import generateUniqueSlug from "../../../utils/generateUniqueSlug.js";
import BranchModel from "./branch.model.js";

class BranchRepository extends BaseRepository {
  constructor() {
    super(BranchModel, {
      brandScoped: true,
      branchScoped: false, // Branch IS the scope unit — branchScoped doesn't apply to itself.
      enableSoftDelete: true,
      defaultPopulate: ["brand", "createdBy", "updatedBy"],
      searchableFields: ["name.EN", "name.AR", "slug"],
    });
  }

  /** Uniqueness-checking DB read, wrapped for reuse by create/update in the service. */
  async generateSlugFor(name, brandId, excludeId) {
    return generateUniqueSlug({ name, model: this.model, brandId, excludeId });
  }

  /** Pure query — used by the service to enforce "one main branch per brand". */
  async findMainBranch(brandId, excludeId) {
    const filter = { brand: brandId, isMainBranch: true, isDeleted: false };
    if (excludeId) filter._id = { $ne: excludeId };
    return this.model.findOne(filter);
  }

  async insertBranch(payload) {
    return this.model.create(payload);
  }

  async updateBranchDocument(id, brandId, payload) {
    return this.model.findOneAndUpdate({ _id: id, brand: brandId }, { $set: payload }, { new: true });
  }

  async unsetAllMainBranches(brandId) {
    return this.model.updateMany({ brand: brandId }, { isMainBranch: false });
  }

  // =========================
  // GET ALL (pagination + geo + multilingual search) — a single compound
  // query, kept here as one unit for the same reason BaseRepository.getAll
  // itself builds filter+sort+pagination in one method rather than splitting
  // query-param interpretation across layers.
  // =========================
  async getAllBranches({ brandId, query }) {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      isMainBranch,
      city,
      country,
      lat,
      lng,
      maxDistance = 5000,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = query;

    const filter = {
      brand: brandId,
      isDeleted: false,
    };

    if (status) filter.status = status;
    if (typeof isMainBranch !== "undefined") filter.isMainBranch = isMainBranch;
    if (city) filter["address.city"] = { $exists: true };
    if (country) filter["address.country"] = { $exists: true };

    if (search) {
      filter.$or = [
        { slug: { $regex: search, $options: "i" } },
        { "name.EN": { $regex: search, $options: "i" } },
        { "name.AR": { $regex: search, $options: "i" } },
      ];
    }

    let geoFilter = {};
    if (lat && lng) {
      geoFilter = {
        location: {
          $near: {
            $geometry: { type: "Point", coordinates: [lng, lat] },
            $maxDistance: maxDistance,
          },
        },
      };
    }

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };
    const finalFilter = { ...filter, ...geoFilter };

    const [data, total] = await Promise.all([
      this.model
        .find(finalFilter)
        .populate("brand createdBy updatedBy")
        .sort(sort)
        .skip(skip)
        .limit(limit),
      this.model.countDocuments(finalFilter),
    ]);

    return {
      success: true,
      data,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // =========================
  // BULK SOFT DELETE
  // =========================
  async bulkSoftDelete({ ids, brandId, userId }) {
    return this.model.updateMany(
      { _id: { $in: ids }, brand: brandId },
      { isDeleted: true, deletedBy: userId, deletedAt: new Date() },
    );
  }

  // =========================
  // OVERRIDES — brand-scoped, correct object signature (see BaseController
  // contract). Plain "not found" 404s here, not business rules — same
  // convention BaseRepository's own inherited methods already use.
  // =========================
  async hardDelete({ id, brandId }) {
    const branch = await this.model.findOneAndDelete({ _id: id, brand: brandId });
    if (!branch) throwError("Branch not found", 404);
    return branch;
  }

  async softDelete({ id, brandId, userId }) {
    const branch = await this.model.findOneAndUpdate(
      { _id: id, brand: brandId },
      { isDeleted: true, deletedBy: userId, deletedAt: new Date() },
      { new: true },
    );
    if (!branch) throwError("Branch not found", 404);
    return branch;
  }

  async restore({ id, brandId }) {
    const branch = await this.model.findOneAndUpdate(
      { _id: id, brand: brandId },
      { isDeleted: false, deletedBy: null, deletedAt: null },
      { new: true },
    );
    if (!branch) throwError("Branch not found", 404);
    return branch;
  }
}

export default BranchRepository;
