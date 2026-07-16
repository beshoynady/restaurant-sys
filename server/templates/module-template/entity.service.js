// TEMPLATE — Service layer (BACKEND_FOUNDATION.md §4.3 / ERP_DEVELOPMENT_STANDARD.md §3).
// Business rules + orchestration only — zero raw Mongoose calls outside the repository (or, for a
// report/dashboard method, a documented read of another module's model — see the Standard §2).
import throwError from "../../../utils/throwError.js";
import { createTransitionGuard } from "../../../utils/TransitionGuard.js";

// ============================================================================================
// OPTION A — Repository Pattern (keep entity.repository.js). Use when this module needs
// multi-document transactional writes. Delete Option B below if you use this one.
// ============================================================================================
import EntityRepository from "./entity.repository.js";

const transitionGuard = createTransitionGuard({
  Draft: ["Active", "Cancelled"],
  Active: ["Cancelled"],
  Cancelled: [],
});

class EntityService extends EntityRepository {
  /** TEMPLATE: derived-field enforcement — beforeCreate only guards create(), lockedUpdateFields guards update(). */
  async beforeCreate(data) {
    // this._validateSomeCrossFieldRule(data);
    return { ...data /* , computedTotal: ... */ };
  }

  /** TEMPLATE: an atomic-claim status transition. */
  async activate({ id, brand, branch, actorId }) {
    const entity = await this.findByIdScoped(id, brand, null);
    if (!entity) throwError("Not found.", 404);
    transitionGuard.assertValid(entity.status, "Active");

    const claimed = await this.transitionStatus(id, brand, entity.status, { status: "Active", updatedBy: actorId });
    if (!claimed) throwError("This record was already changed by a concurrent request.", 409);
    return claimed;
  }

  /**
   * TEMPLATE: a business-verb method with GL posting — see ERP_DEVELOPMENT_STANDARD.md §3's three
   * standing rules before writing anything like this: (1) GL posting is best-effort/non-blocking,
   * its own try/catch; (2) a real operational fact (a balance change) happens UNCONDITIONALLY,
   * never inside that same try/catch; (3) the mapped-back journalEntry reference must be applied to
   * BOTH the persisted document AND the in-memory object being returned to the caller.
   */
  // async doSomethingWithAccountingImpact({ id, brand, branch, actorId }) { ... }
}

export default new EntityService();
export { transitionGuard as entityTransitionGuard };

// ============================================================================================
// OPTION B — plain AdvancedService (delete entity.repository.js if you use this instead of Option A).
// Use for straightforward CRUD + single-collection atomic-claim transitions — do not default to
// the Repository Pattern "because it's more enterprise" when this is all a module actually needs.
// ============================================================================================
// import EntityModel from "./entity.model.js";
// import AdvancedService from "../../../utils/BaseRepository.js";
// import throwError from "../../../utils/throwError.js";
// import { createTransitionGuard } from "../../../utils/TransitionGuard.js";
//
// const transitionGuard = createTransitionGuard({
//   Draft: ["Active", "Cancelled"],
//   Active: ["Cancelled"],
//   Cancelled: [],
// });
//
// class EntityService extends AdvancedService {
//   constructor() {
//     super(EntityModel, {
//       brandScoped: true,
//       branchScoped: true,
//       enableSoftDelete: false,
//       defaultPopulate: ["brand", "branch", "createdBy", "updatedBy"],
//       searchableFields: [],
//       defaultSort: { createdAt: -1 },
//       lockedUpdateFields: ["status"],
//     });
//   }
//
//   async beforeCreate(data) {
//     return { ...data };
//   }
//
//   async activate({ id, brand, branch, actorId }) {
//     const entity = await this.model.findOne({ _id: id, brand, branch });
//     if (!entity) throwError("Not found.", 404);
//     transitionGuard.assertValid(entity.status, "Active");
//
//     const claimed = await this.model.findOneAndUpdate(
//       { _id: id, brand, branch, status: entity.status },
//       { $set: { status: "Active", updatedBy: actorId } },
//       { new: true },
//     );
//     if (!claimed) throwError("This record was already changed by a concurrent request.", 409);
//     return claimed;
//   }
// }
//
// export default new EntityService();
// export { transitionGuard as entityTransitionGuard };
