// TEMPLATE — Repository layer (BACKEND_FOUNDATION.md §4.3 / ERP_DEVELOPMENT_STANDARD.md §2).
// DELETE THIS FILE if this module doesn't need multi-document transactional writes or session-aware
// primitives — a plain `class EntityService extends AdvancedService` in entity.service.js (see the
// alternate constructor block in that file) is simpler and just as correct for straightforward CRUD
// + single-collection atomic-claim transitions.
import BaseRepository from "../../../utils/BaseRepository.js";
import EntityModel from "./entity.model.js";

class EntityRepository extends BaseRepository {
  constructor() {
    super(EntityModel, {
      brandScoped: true,
      branchScoped: true, // TEMPLATE: match whichever branch pattern you kept in entity.model.js
      enableSoftDelete: false, // TEMPLATE: see ERP_DEVELOPMENT_STANDARD.md §2, "Soft delete policy"
      defaultPopulate: ["brand", "branch", "createdBy", "updatedBy"],
      searchableFields: [], // TEMPLATE: only populate if this entity has a natural free-text field
      defaultSort: { createdAt: -1 },
      // TEMPLATE: every derived/workflow field goes here — stripped from every update() payload.
      lockedUpdateFields: ["status"],
    });
  }

  /** TEMPLATE: insert one document within an existing transaction session. */
  async insertEntity(data, session) {
    const [doc] = await EntityModel.create([data], { session });
    return doc;
  }

  /** TEMPLATE: tenant-scoped, session-aware lookup — needed before every transition-guard check. */
  async findByIdScoped(id, brandId, session) {
    return this.model.findOne({ _id: id, brand: brandId }).session(session ?? null);
  }

  /**
   * TEMPLATE: the atomic-claim transition primitive — only succeeds if the document still matches
   * `fromStatus` at write time. Returns null (not an error) if the precondition didn't hold;
   * callers translate that into a business error with a message specific to the attempted
   * transition.
   */
  async transitionStatus(id, brandId, fromStatus, updateFields, session) {
    return this.model.findOneAndUpdate(
      { _id: id, brand: brandId, status: fromStatus },
      { $set: updateFields },
      { new: true, session: session ?? undefined },
    );
  }
}

export default EntityRepository;
