import RecurringExpenseTemplateModel from "./recurring-expense-template.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";
import throwError from "../../../utils/throwError.js";
import { createTransitionGuard } from "../../../utils/TransitionGuard.js";
import dailyExpenseService from "../daily-expense/daily-expense.service.js";

const transitionGuard = createTransitionGuard({
  Active: ["Paused", "Cancelled"],
  Paused: ["Active", "Cancelled"],
  Cancelled: [],
});

/**
 * Scheduling Engine (pure, exported for unit testing — matches
 * asset-depreciation.service.js#calculateDepreciationAmount's "no I/O, isolated calculation"
 * convention): advances `date` by one occurrence of `frequency`. Calendar-unit frequencies
 * (Monthly/Quarterly/Yearly) use `setUTCMonth`/`setUTCFullYear` so a template anchored on the 31st
 * naturally rolls to the last valid day of a shorter month via JS Date's own overflow behavior,
 * matching how every other date-in-the-future computation in this codebase is done (no calendar
 * library dependency).
 */
export function advanceDate(date, frequency, customIntervalDays = null) {
  const d = new Date(date);
  switch (frequency) {
    case "Daily":
      d.setUTCDate(d.getUTCDate() + 1);
      break;
    case "Weekly":
      d.setUTCDate(d.getUTCDate() + 7);
      break;
    case "Monthly":
      d.setUTCMonth(d.getUTCMonth() + 1);
      break;
    case "Quarterly":
      d.setUTCMonth(d.getUTCMonth() + 3);
      break;
    case "Yearly":
      d.setUTCFullYear(d.getUTCFullYear() + 1);
      break;
    case "Custom":
      if (!customIntervalDays || customIntervalDays < 1) {
        throw new Error("Custom frequency requires a positive customIntervalDays.");
      }
      d.setUTCDate(d.getUTCDate() + customIntervalDays);
      break;
    default:
      throw new Error(`Unknown recurring expense frequency: ${frequency}`);
  }
  return d;
}

class RecurringExpenseTemplateService extends AdvancedService {
  constructor() {
    super(RecurringExpenseTemplateModel, {
      brandScoped: true,
      branchScoped: true,
      // Config/master data (a schedule, not a money-out event) — soft-deletable like
      // ExpenseSettings/CostCenter, unlike the transactional DailyExpense documents it generates.
      enableSoftDelete: true,
      defaultPopulate: [
        "brand", "branch", "expense", "costCenter", "paymentTemplate.paymentMethod",
        "paymentTemplate.cashRegister", "paymentTemplate.bankAccount", "paymentTemplate.paidBy",
        "createdBy", "updatedBy",
      ],
      searchableFields: [],
      defaultSort: { createdAt: -1 },
      // The scheduling engine's own state — advanced exclusively by generateDueOccurrences()/
      // generateNow(), never by a generic PUT (the same "generic PUT bypasses business rules"
      // defect class fixed repeatedly elsewhere in this domain). `status` goes through
      // pause()/resume()/cancelTemplate() so the Cancelled-is-terminal rule can't be bypassed either.
      lockedUpdateFields: ["nextRunDate", "lastGeneratedDate", "status"],
    });
  }

  _validatePaymentTemplate(lines) {
    for (const line of lines) {
      const hasCashRegister = Boolean(line.cashRegister);
      const hasBankAccount = Boolean(line.bankAccount);
      if (hasCashRegister === hasBankAccount) {
        throwError(
          "Each payment template line must specify exactly one of cashRegister or bankAccount, not both or neither.",
          400,
        );
      }
    }
  }

  _validateFrequency(frequency, customIntervalDays) {
    if (frequency === "Custom" && !customIntervalDays) {
      throwError("Custom frequency requires customIntervalDays to be set.", 400);
    }
    if (frequency !== "Custom" && customIntervalDays) {
      throwError("customIntervalDays only applies when frequency is Custom.", 400);
    }
  }

  /** nextRunDate always starts at the template's own startDate — the first occurrence is due exactly then, not "one period later." */
  async beforeCreate(data) {
    this._validateFrequency(data.frequency, data.customIntervalDays);
    this._validatePaymentTemplate(data.paymentTemplate);
    return { ...data, nextRunDate: data.startDate };
  }

  async beforeUpdate(data) {
    if (data.paymentTemplate) this._validatePaymentTemplate(data.paymentTemplate);
    if (data.frequency) this._validateFrequency(data.frequency, data.customIntervalDays);
    return data;
  }

  async pause({ id, brand, branch, actorId }) {
    const claimed = await this.model.findOneAndUpdate(
      { _id: id, brand, branch, status: "Active" },
      { $set: { status: "Paused", updatedBy: actorId } },
      { new: true },
    );
    if (!claimed) throwError("Template not found, or is not Active.", 409);
    return claimed;
  }

  async resume({ id, brand, branch, actorId }) {
    const claimed = await this.model.findOneAndUpdate(
      { _id: id, brand, branch, status: "Paused" },
      { $set: { status: "Active", updatedBy: actorId } },
      { new: true },
    );
    if (!claimed) throwError("Template not found, or is not Paused.", 409);
    return claimed;
  }

  /** Terminal — a cancelled template never generates again; scheduling a fresh recurrence means creating a new template. */
  async cancelTemplate({ id, brand, branch, actorId }) {
    const template = await this.model.findOne({ _id: id, brand, branch });
    if (!template) throwError("Template not found.", 404);
    transitionGuard.assertValid(template.status, "Cancelled");

    const claimed = await this.model.findOneAndUpdate(
      { _id: id, brand, branch, status: template.status },
      { $set: { status: "Cancelled", updatedBy: actorId } },
      { new: true },
    );
    if (!claimed) throwError("This template was already changed by a concurrent request.", 409);
    return claimed;
  }

  /**
   * Scheduling Engine: generates one DailyExpense for every Active template due on or before
   * `asOfDate` (and still within its `endDate` window, if any) — one occurrence per template per
   * call, so a long-overdue template catches up gradually across repeated calls rather than
   * flooding a single run with every missed period at once. No background scheduler exists in this
   * codebase (confirmed platform-wide); this method is designed to be trivially callable from a
   * future one, the same "engine without a scheduler" convention already established by
   * asset-depreciation.service.js#generateForPeriod. Returns a per-template result list rather than
   * throwing on the first failure, so one misconfigured template can't block every other due
   * template in the same run.
   */
  async generateDueOccurrences({ brand, branch = null, asOfDate = new Date(), actorId }) {
    const filter = { brand, status: "Active", nextRunDate: { $lte: asOfDate } };
    if (branch) filter.branch = branch;
    const dueTemplates = await this.model.find(filter);

    const results = [];
    for (const template of dueTemplates) {
      if (template.endDate && template.nextRunDate > template.endDate) continue;
      try {
        const occurrence = await this._generateOne(template, actorId, { advanceSchedule: true });
        results.push({ template: template._id, dailyExpense: occurrence._id, status: "generated" });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`[recurring-expense-template.service] Generation failed for template ${template._id}: ${err.message}`);
        results.push({ template: template._id, status: "failed", error: err.message });
      }
    }
    return results;
  }

  /**
   * Manual escape hatch: generates one occurrence for a specific template right now, independent of
   * its schedule (does not require `nextRunDate` to be due, and does not advance it) — for an
   * ad-hoc/one-off charge on an otherwise-recurring expense, or to manually recover an occurrence
   * that `generateDueOccurrences()` skipped because DailyExpense creation failed after the schedule
   * had already been claimed (see this module's own doc, "Architecture Decisions", for why that
   * ordering trade-off was accepted rather than built out with full cross-service transactionality).
   */
  async generateNow({ id, brand, branch, actorId }) {
    const template = await this.model.findOne({ _id: id, brand, branch, status: "Active" });
    if (!template) throwError("Template not found, or is not Active.", 404);
    return this._generateOne(template, actorId, { advanceSchedule: false });
  }

  async _generateOne(template, actorId, { advanceSchedule }) {
    const occurrenceDate = template.nextRunDate;

    if (advanceSchedule) {
      // Atomic claim: only succeeds if nextRunDate still matches what we read, so two concurrent
      // generation runs can't both generate the same due occurrence — the same TOCTOU-safe pattern
      // used by every other terminal transition in this platform. Claimed BEFORE the DailyExpense
      // is created (see module doc §13 for the accepted trade-off this implies).
      const advancedTo = advanceDate(template.nextRunDate, template.frequency, template.customIntervalDays);
      const claimed = await this.model.findOneAndUpdate(
        { _id: template._id, nextRunDate: template.nextRunDate },
        { $set: { nextRunDate: advancedTo, lastGeneratedDate: occurrenceDate } },
        { new: true },
      );
      if (!claimed) throwError("This template's schedule was already advanced by a concurrent run.", 409);
    }

    return dailyExpenseService.create({
      brandId: template.brand, branchId: template.branch, createdBy: actorId,
      data: {
        branch: template.branch,
        date: occurrenceDate,
        expense: template.expense,
        expenseDescription: template.expenseDescription,
        costCenter: template.costCenter,
        paid: template.paymentTemplate.map((line) => ({
          paymentMethod: line.paymentMethod, amount: line.amount,
          cashRegister: line.cashRegister, bankAccount: line.bankAccount, paidBy: line.paidBy,
        })),
        taxAmount: template.taxAmount,
        notes: `Generated by recurring expense template "${template.expenseDescription}".`,
        status: template.requireApproval ? "Draft" : "Posted",
        recurringExpenseTemplate: template._id,
      },
    });
  }
}

export default new RecurringExpenseTemplateService();
export { transitionGuard as recurringExpenseTemplateTransitionGuard };
