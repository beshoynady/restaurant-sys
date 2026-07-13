// Service layer (BACKEND_FOUNDATION.md §4.3): the Payroll Component
// Engine's validation and formula-evaluation logic. Previously this module
// had zero business logic — a hand-written CRUD service, and the formula/
// condition tokens it stored were never evaluated anywhere in the codebase.
import throwError from "../../../utils/throwError.js";
import PayrollItemRepository from "./payroll-item.repository.js";
import { validateTokenSequence, evaluateFormula, detectCircularDependency } from "./payroll-item.domain.js";

const CREDIT_CATEGORIES = new Set(["EARNING"]);
const DEBIT_CATEGORIES = new Set(["DEDUCTION", "TAX", "INSURANCE"]);

class PayrollItemService extends PayrollItemRepository {
  /** "Reject duplicate payroll items" — a friendlier pre-check ahead of the {brand,code} unique index's raw E11000. */
  async assertUniqueCode(code, brandId, excludeId) {
    const existing = await this.findByCode(code, brandId, excludeId);
    if (existing) throwError(`A payroll item with code "${code}" already exists for this brand`, 400);
  }

  /** "Reject invalid policy combinations": category must agree with payrollEffect. */
  assertCoherentEffect(category, payrollEffect) {
    if (CREDIT_CATEGORIES.has(category) && payrollEffect !== "credit") {
      throwError(`Category "${category}" must have payrollEffect "credit"`, 400);
    }
    if (DEBIT_CATEGORIES.has(category) && payrollEffect !== "debit") {
      throwError(`Category "${category}" must have payrollEffect "debit"`, 400);
    }
  }

  /** "Reject inconsistent tax/insurance settings": employer-cost items must be tax/insurance in nature. */
  assertCoherentEmployerCost(category, isEmployerCost) {
    if (isEmployerCost && !["TAX", "INSURANCE"].includes(category)) {
      throwError('"isEmployerCost" can only be true for category "TAX" or "INSURANCE"', 400);
    }
  }

  /** "Reject impossible formulas / invalid calculation configuration". */
  assertCoherentCalculation(data, knownItemCodes) {
    if (data.calculationType === "FIXED" && (data.fixedAmount === undefined || data.fixedAmount === null)) {
      throwError('calculationType "FIXED" requires a fixedAmount', 400);
    }
    if (data.calculationType === "RATE" && (!data.rate || !data.rateBase)) {
      throwError('calculationType "RATE" requires both rate and rateBase', 400);
    }
    if (data.calculationType === "FORMULA") {
      const tokens = data.formula?.tokens;
      if (!tokens || tokens.length === 0) {
        throwError('calculationType "FORMULA" requires at least one formula token', 400);
      }
      const { valid, errors } = validateTokenSequence(tokens, { knownItemCodes });
      if (!valid) throwError(`Invalid formula: ${errors.join("; ")}`, 400);
    }

    if (data.executionCondition?.tokens?.length) {
      const { valid, errors } = validateTokenSequence(data.executionCondition.tokens, { knownItemCodes });
      if (!valid) throwError(`Invalid execution condition: ${errors.join("; ")}`, 400);
    }
  }

  /** "Reject invalid accounting mappings": every configured account/cost center must exist, belong to this brand, and (for accounts) allow posting. */
  async assertValidAccounting(accounting, brandId) {
    if (!accounting) return;

    for (const field of ["debitAccount", "creditAccount"]) {
      const accountId = accounting[field];
      if (!accountId) continue;

      const account = await this.findAccountForScope(accountId, brandId);
      if (!account) throwError(`Accounting: "${field}" references an account that does not exist`, 400);
      if (!account.allowPosting) throwError(`Accounting: "${field}" references an account that does not allow posting`, 400);
      if (account.status !== "active") throwError(`Accounting: "${field}" references an inactive account`, 400);
    }

    if (accounting.costCenter) {
      const costCenter = await this.findCostCenterForScope(accounting.costCenter, brandId);
      if (!costCenter) throwError('Accounting: "costCenter" references a cost center that does not exist', 400);
      if (!costCenter.isActive) throwError('Accounting: "costCenter" references an inactive cost center', 400);
    }
  }

  /** "Reject circular dependencies". */
  async assertNoCircularDependency(itemId, dependsOn, brandId) {
    if (!dependsOn || dependsOn.length === 0) return;

    const dependencies = await this.findDependenciesForScope(dependsOn, brandId);
    if (dependencies.length !== dependsOn.length) {
      throwError("One or more items in dependsOn do not exist for this brand", 404);
    }

    const graph = await this.findDependencyGraph(brandId);
    // Overlay the candidate edges (a create has no real id yet — use a
    // sentinel; an update overwrites the existing node's own dependsOn).
    const nodeId = itemId ? String(itemId) : "__new__";
    graph.set(nodeId, { dependsOn: dependsOn.map(String) });

    const cycle = detectCircularDependency(nodeId, graph);
    if (cycle) {
      const codes = cycle.map((id) => graph.get(id)?.code || id).join(" -> ");
      throwError(`Circular dependency detected: ${codes}`, 400);
    }
  }

  async beforeCreate(data) {
    if (data.code) await this.assertUniqueCode(data.code, data.brand);

    this.assertCoherentEffect(data.category, data.payrollEffect);
    this.assertCoherentEmployerCost(data.category, data.isEmployerCost);

    const existingItems = await this.model.find({ brand: data.brand, isDeleted: false }).select("code").lean();
    this.assertCoherentCalculation(data, existingItems.map((i) => i.code));

    if (data.accounting) await this.assertValidAccounting(data.accounting, data.brand);
    if (data.dependsOn?.length) await this.assertNoCircularDependency(null, data.dependsOn, data.brand);

    return data;
  }

  /**
   * Overridden (not just beforeUpdate) because re-validating category/
   * payrollEffect coherence, calculation configuration, and circular
   * dependencies on a partial update requires the existing document merged
   * with the incoming change — same pattern used throughout this rollout
   * (AttendanceRecord, EmployeeFinancialProfile, PayrollSettings, ...).
   */
  async update(opts) {
    this.validateObjectId(opts.id);

    const existing = await this.model.findOne({ _id: opts.id, brand: opts.brandId, isDeleted: false }).lean();
    if (!existing) throwError("Resource not found", 404);

    const merged = { ...existing, ...opts.data };

    if (opts.data.code && opts.data.code !== existing.code) {
      await this.assertUniqueCode(opts.data.code, opts.brandId, opts.id);
    }
    if (opts.data.category || opts.data.payrollEffect) {
      this.assertCoherentEffect(merged.category, merged.payrollEffect);
    }
    if (opts.data.category || opts.data.isEmployerCost !== undefined) {
      this.assertCoherentEmployerCost(merged.category, merged.isEmployerCost);
    }
    if (opts.data.calculationType || opts.data.formula || opts.data.executionCondition || opts.data.rate || opts.data.rateBase) {
      const existingItems = await this.model.find({ brand: opts.brandId, isDeleted: false, _id: { $ne: opts.id } }).select("code").lean();
      this.assertCoherentCalculation(merged, existingItems.map((i) => i.code));
    }
    if (opts.data.accounting) {
      await this.assertValidAccounting({ ...existing.accounting, ...opts.data.accounting }, opts.brandId);
    }
    if (opts.data.dependsOn) {
      await this.assertNoCircularDependency(opts.id, opts.data.dependsOn, opts.brandId);
    }

    return super.update(opts);
  }

  /**
   * The Formula Engine's public entry point — evaluates one item's
   * `formula`/`executionCondition` against a caller-supplied variable
   * context (see payroll-item.domain.js#VARIABLE_REGISTRY for the
   * supported variable names). This is what a future `hr/payroll`
   * calculation engine would call per item, per employee, per period —
   * not built here (see module doc §1), but the evaluator itself is real
   * and independently tested, not a stub.
   */
  evaluateItem(item, context) {
    if (item.executionCondition?.tokens?.length) {
      const conditionResult = evaluateFormula(item.executionCondition.tokens, context);
      if (!conditionResult) return { applies: false, amount: 0 };
    }

    let amount = 0;
    if (item.calculationType === "FIXED") {
      amount = item.fixedAmount || 0;
    } else if (item.calculationType === "RATE") {
      const base = context[item.rateBase];
      if (base === undefined) throwError(`Rate base "${item.rateBase}" was not provided in the evaluation context`, 400);
      amount = (Number(base) * item.rate) / 100;
    } else if (item.calculationType === "FORMULA") {
      amount = evaluateFormula(item.formula?.tokens, context) || 0;
    }
    // "MANUAL" — amount is supplied by the caller directly; this engine has nothing to compute.

    return { applies: true, amount };
  }
}

export default new PayrollItemService();
