import BaseService from "../../../utils/BaseService.js";
import throwErrorJs from "../../../utils/throwError.js";
import generateUniqueSlugJs from "../../../utils/generateUniqueSlug.js";
import BranchModel, { type IBranch } from "./branch.model.js";

// throwError.js/generateUniqueSlug.js have no .d.ts yet (only BaseService.js
// and BaseController.js do, per BACKEND_FOUNDATION.md §5.3) — narrow,
// explicit call-signature casts here instead of leaving them fully `any`.
const throwError = throwErrorJs as (message: string, statusCode: number) => never;
const generateUniqueSlug = generateUniqueSlugJs as (opts: {
  name: unknown;
  model: unknown;
  brandId: string;
  excludeId?: string;
}) => Promise<string>;

interface CreateBranchInput {
  brandId?: string | null;
  data: Record<string, unknown> & { name: unknown; isMainBranch?: boolean };
  createdBy?: string | null;
}

interface UpdateBranchInput {
  id: string;
  brandId?: string | null;
  data: Record<string, unknown> & { name?: unknown; isMainBranch?: boolean };
  updatedBy?: string | null;
}

interface ScopedIdInput {
  id: string;
  brandId?: string | null;
  userId?: string | null;
}

interface BulkScopedInput {
  ids: string[];
  brandId?: string | null;
  userId?: string | null;
}

interface GetAllBranchesQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  isMainBranch?: boolean;
  city?: string;
  country?: string;
  lat?: number;
  lng?: number;
  maxDistance?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

class BranchService extends BaseService<IBranch> {
  constructor() {
    super(BranchModel, {
      brandScoped: true,
      branchScoped: false, // Branch IS the scope unit — branchScoped doesn't apply to itself.
      enableSoftDelete: true,
      defaultPopulate: ["brand", "createdBy", "updatedBy"],
      searchableFields: ["name.EN", "name.AR", "slug"],
    });
  }

  // =========================
  // CREATE
  // =========================
  async create({ brandId, data, createdBy }: CreateBranchInput): Promise<IBranch> {
    const slug = await generateUniqueSlug({
      name: data.name,
      model: this.model,
      brandId,
    });

    if (data.isMainBranch) {
      const isMainExists = await this.model.findOne({
        brand: brandId,
        isMainBranch: true,
        isDeleted: false,
      });

      if (isMainExists) {
        throwError("Main branch already exists", 400);
      }
    }

    return this.model.create({
      ...data,
      slug,
      brand: brandId,
      createdBy,
    });
  }

  // =========================
  // UPDATE
  // =========================
  async update({ id, brandId, data, updatedBy }: UpdateBranchInput): Promise<IBranch> {
    const payload: Record<string, unknown> = { ...data };

    if (data.name) {
      payload.slug = await generateUniqueSlug({
        name: data.name,
        model: this.model,
        brandId,
        excludeId: id,
      });
    }

    if (data.isMainBranch) {
      const exists = await this.model.findOne({
        brand: brandId,
        isMainBranch: true,
        _id: { $ne: id },
        isDeleted: false,
      });

      if (exists) throwError("Another main branch exists", 400);
    }

    const branch = await this.model.findOneAndUpdate(
      { _id: id, brand: brandId },
      { $set: { ...payload, updatedBy } },
      { new: true },
    );

    if (!branch) throwError("Branch not found", 404);
    return branch as IBranch;
  }

  // =========================
  // GET ALL (pagination + geo + multilingual search)
  // =========================
  async getAllBranches({ brandId, query }: { brandId: string; query: GetAllBranchesQuery }) {
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

    const filter: Record<string, unknown> = {
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

    let geoFilter: Record<string, unknown> = {};
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
    const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder === "asc" ? 1 : -1 };
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
  // MAIN BRANCH
  // =========================
  async setMainBranch({ id, brandId, userId }: ScopedIdInput): Promise<IBranch> {
    await this.model.updateMany({ brand: brandId }, { isMainBranch: false });

    const branch = await this.model.findOneAndUpdate(
      { _id: id, brand: brandId },
      { isMainBranch: true, updatedBy: userId },
      { new: true },
    );

    if (!branch) throwError("Branch not found", 404);
    return branch as IBranch;
  }

  // =========================
  // BULK SOFT DELETE
  // =========================
  async bulkSoftDelete({ ids, brandId, userId }: BulkScopedInput) {
    return this.model.updateMany(
      { _id: { $in: ids }, brand: brandId },
      { isDeleted: true, deletedBy: userId, deletedAt: new Date() },
    );
  }

  // =========================
  // OVERRIDES — brand-scoped, correct object signature (see BaseController contract)
  // =========================
  async hardDelete({ id, brandId }: ScopedIdInput): Promise<IBranch> {
    const branch = await this.model.findOneAndDelete({ _id: id, brand: brandId });
    if (!branch) throwError("Branch not found", 404);
    return branch as IBranch;
  }

  async softDelete({ id, brandId, userId }: ScopedIdInput): Promise<IBranch> {
    const branch = await this.model.findOneAndUpdate(
      { _id: id, brand: brandId },
      { isDeleted: true, deletedBy: userId, deletedAt: new Date() },
      { new: true },
    );
    if (!branch) throwError("Branch not found", 404);
    return branch as IBranch;
  }

  async restore({ id, brandId }: ScopedIdInput): Promise<IBranch> {
    const branch = await this.model.findOneAndUpdate(
      { _id: id, brand: brandId },
      { isDeleted: false, deletedBy: null, deletedAt: null },
      { new: true },
    );
    if (!branch) throwError("Branch not found", 404);
    return branch as IBranch;
  }
}

export default new BranchService();
