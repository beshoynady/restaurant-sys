// Repository layer: owns all direct database access for BudgetLine. Generic CRUD (inherited) plus
// the session-aware bulk-insert primitive budget.service.js's transactional create path needs —
// mirrors journal-line.repository.js's shape.
import BaseRepository from "../../../utils/BaseRepository.js";
import BudgetLineModel from "./budget-line.model.js";

class BudgetLineRepository extends BaseRepository {
  constructor() {
    super(BudgetLineModel, {
      brandScoped: true,
      branchScoped: false,
      enableSoftDelete: false,
      defaultPopulate: ["brand", "branch", "account"],
      searchableFields: [],
      defaultSort: { createdAt: 1 },
      // Every line is written exclusively through budget.service.js's composite operations
      // (creating/replacing a budget's lines is only legal while the parent Budget is Draft — a
      // rule the service enforces by checking the parent, not something a line-level field lock
      // alone could express). Locked to prevent a generic PUT from silently drifting a line's
      // figures out of sync with the cached totalAnnualAmount on its parent Budget.
      lockedUpdateFields: ["budget", "brand", "branch", "account"],
    });
  }

  /** Insert many BudgetLine documents within an existing transaction session. */
  async insertMany(docs, session) {
    return BudgetLineModel.insertMany(docs, { session, ordered: true });
  }

  /** All lines for one budget, session-aware. */
  async findByBudget(budgetId, session) {
    return this.model.find({ budget: budgetId }).session(session ?? null);
  }

  /** Removes every existing line for a budget within a transaction — used when Draft lines are replaced wholesale. */
  async deleteByBudget(budgetId, session) {
    return this.model.deleteMany({ budget: budgetId }, { session: session ?? undefined });
  }
}

export default BudgetLineRepository;
