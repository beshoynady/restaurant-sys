import mongoose from "mongoose";
import throwError from "./throwError.js";

type AnyObject = Record<string, any>;

type BaseServiceOptions = {
  brandScoped?: boolean;
  enableSoftDelete?: boolean;
  defaultSort?: AnyObject;
  searchableFields?: string[];
  defaultPopulate?: string[];
};

/**
 * TypeScript version of server/utils/BaseService.js
 * Generic service layer for Mongoose models.
 */
export default class BaseService<TDoc = AnyObject> {
  model: mongoose.Model<any>;

  brandScoped: boolean;
  enableSoftDelete: boolean;

  defaultSort: AnyObject;
  searchableFields: string[];
  defaultPopulate: string[];

  constructor(model: mongoose.Model<any>, options: BaseServiceOptions = {}) {
    this.model = model;

    this.brandScoped = options.brandScoped ?? true;
    this.enableSoftDelete = options.enableSoftDelete ?? true;

    this.defaultSort = options.defaultSort ?? { createdAt: -1 };
    this.searchableFields = options.searchableFields ?? [];
    this.defaultPopulate = options.defaultPopulate ?? [];
  }

  validateObjectId(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw throwError("Invalid resource ID", 400);
    }
  }

  buildBaseQuery({
    brandId = null,
    includeDeleted = false,
    filters = {},
  }: {
    brandId?: string | null;
    includeDeleted?: boolean;
    filters?: AnyObject;
  } = {}) {
    const query: AnyObject = { ...filters };

    if (this.brandScoped && brandId) {
      query.brand = brandId;
    }

    if (this.enableSoftDelete) {
      query.isDeleted = includeDeleted ? { $in: [true, false] } : false;
    }

    return query;
  }

  applySearch(query: AnyObject, search: string) {
    if (!search || !this.searchableFields.length) {
      return query;
    }

    const escapeRegex = (text = "") =>
      text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const keyword = escapeRegex(search.trim());

    query.$or = this.searchableFields.map((field) => ({
      [field]: { $regex: keyword, $options: "i" },
    }));

    return query;
  }

  async bulkSoftDelete({
    ids,
    brandId,
    deletedBy = null,
  }: {
    ids: string[];
    brandId?: string | null;
    deletedBy?: string | null;
  }) {
    return this.model.updateMany(
      {
        _id: { $in: ids },
        ...this.buildBaseQuery({ brandId }),
      },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy,
        },
      },
    );
  }

  async bulkRestore({ ids, brandId }: { ids: string[]; brandId?: string | null }) {
    return this.model.updateMany(
      {
        _id: { $in: ids },
        ...this.buildBaseQuery({ brandId, includeDeleted: true }),
      },
      {
        $set: {
          isDeleted: false,
          deletedAt: null,
          deletedBy: null,
        },
      },
    );
  }

  async bulkHardDelete({
    ids,
    brandId = null,
  }: {
    ids: string[];
    brandId?: string | null;
  }) {
    return this.model.deleteMany({
      _id: { $in: ids },
      ...(this.brandScoped && brandId ? { brand: brandId } : {}),
    });
  }

  async exists({ id, brandId }: { id: string; brandId?: string | null }) {
    return this.model.exists({
      _id: id,
      ...this.buildBaseQuery({ brandId }),
    });
  }

  async count({
    brandId,
    filters = {},
    includeDeleted = false,
  }: {
    brandId?: string | null;
    filters?: AnyObject;
    includeDeleted?: boolean;
  }) {
    return this.model.countDocuments(
      this.buildBaseQuery({ brandId, includeDeleted, filters }),
    );
  }
}
