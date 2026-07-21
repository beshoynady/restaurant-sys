// ADR-001-SALES-PAYMENT-ARCHITECTURE.md Phase 2 — real business logic replacing the prior 16-line
// CRUD shell (confirmed by ENTERPRISE_REFUND_ARCHITECTURE_DESIGN.md's source-level audit: no
// invoice interaction, no GL posting, no inventory movement, no lockedUpdateFields existed before
// this file). Mirrors PurchaseReturn.approve()/recordRefund()'s proven shape, reversed for
// Sales/AR, built on MongoDB transactions from the start (the platform-wide standard, ADR-001).
import SalesReturnModel from "./sales-return.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";
import throwError from "../../../utils/throwError.js";
import { isAuthorizedByJobTitle } from "../../../utils/authorizeByJobTitle.js";
import InvoiceModel from "../invoice/invoice.model.js";
import ProductModel from "../../menu/product/product.model.js";
import CashRegisterModel from "../../finance/cash-register/cash-register.model.js";
import cashTransactionService from "../../finance/cash-transaction/cash-transaction.service.js";
import cashierShiftSettingsService from "../../finance/cashier-shift-settings/cashier-shift-settings.service.js";
import accountingSettingService from "../../accounting/accounting-settings/accounting-setting.service.js";
import journalEntryService from "../../accounting/journal-entry/journal-entry.service.js";
import salesReturnSettingsService from "../../sales/rerturn-sales-settings/sales-return-settings.service.js";
import PreparationReturnModel from "../../preparation/preparation-return/preparation-return.model.js";

function journalLine(account, description, debit, credit, currency) {
  return { account, description, debit, credit, currency };
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

class SalesReturnService extends AdvancedService {
  constructor() {
    super(SalesReturnModel, {
      brandScoped: true,
      // Transactional financial document with its own status lifecycle (guarded below) — matches
      // Payment/Invoice/JournalEntry's own convention; soft-delete does not apply.
      enableSoftDelete: false,
      defaultPopulate: ["brand", "branch", "originalInvoice", "order", "cashierShift", "paidBy", "approvedBy", "rejectedBy"],
      searchableFields: [],
      defaultSort: { createdAt: -1 },
      // ADR-001 Phase 2 §15: closes a live, pre-existing security gap — a raw authorized PUT could
      // previously set refundStatus:"REFUNDED" / rewrite total / repoint journalEntry with zero
      // business-rule enforcement. Every field a generic update must never touch.
      lockedUpdateFields: [
        "serial", "originalInvoice", "order", "journalEntry", "reversalOfJournalEntry",
        "items", "subtotal", "salesTax", "serviceTax", "deliveryFee", "discount", "addition", "total",
        "returnType", "refundStatus", "refundMethod", "idempotencyKey",
        "approvedBy", "approvedAt", "rejectedBy", "rejectedAt",
      ],
    });
  }

  /**
   * Step 1 of the Refund flow: validates the requested lines against the original Invoice
   * (server-resolved amounts — a money-moving operation never trusts client-supplied prices),
   * computes the return's total (respecting SalesReturnSettings' refund-component toggles),
   * atomically claims each selected invoice line so it can never be refunded twice, and either
   * auto-approves + posts Step A (+ Step B if `refundMethod` was supplied) when the total is at or
   * below `approvalThresholdAmount`, or leaves the document PENDING_APPROVAL for a
   * `decisionBy`-authorized approver otherwise. Idempotency mirrors PaymentService.recordPayment()'s
   * proven shape exactly (pre-check outside the transaction, re-check inside it).
   */
  async requestRefund({ brand, branch, originalInvoice: invoiceId, order, itemIds, refundMethod, reason, idempotencyKey, actorId }) {
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      throwError("At least one invoice item must be selected for this refund.", 400);
    }

    if (idempotencyKey) {
      const existing = await this.model.findOne({ brand, originalInvoice: invoiceId, idempotencyKey }).lean();
      if (existing) return existing;
    }

    const settings = await salesReturnSettingsService.resolveForBranch(brand, branch);
    if (!settings) {
      throwError("No SalesReturnSettings configured for this brand/branch — cannot process a refund.", 422);
    }
    if (settings.allowReturn === false) {
      throwError("Returns are disabled for this brand/branch (SalesReturnSettings.allowReturn).", 403);
    }
    if (settings.requireReturnReason && !reason?.trim()) {
      throwError("A return reason is required (SalesReturnSettings.requireReturnReason).", 400);
    }

    try {
      const { doc, freshlyCreated } = await this.withTransaction(async (session) => {
        if (idempotencyKey) {
          const existing = await this.model.findOne({ brand, originalInvoice: invoiceId, idempotencyKey }).session(session).lean();
          // An idempotent replay must never re-orchestrate PreparationReturn tickets — those were
          // already created (or scheduled) the first time this key was processed.
          if (existing) return { doc: existing, freshlyCreated: false };
        }

        const invoice = await InvoiceModel.findOne({ _id: invoiceId, brand, branch }).session(session);
        if (!invoice) throwError("Invoice not found.", 404);

        if (settings.maxReturnMinutes) {
          const elapsedMinutes = (Date.now() - new Date(invoice.createdAt).getTime()) / 60000;
          if (elapsedMinutes > settings.maxReturnMinutes) {
            throwError(
              `This return is being raised ${Math.round(elapsedMinutes)} minutes after the sale, exceeding the allowed ${settings.maxReturnMinutes}-minute window (SalesReturnSettings.maxReturnMinutes).`,
              409,
            );
          }
        }

        const selectedLines = [];
        for (const itemId of itemIds) {
          const line = invoice.items.id(itemId);
          if (!line) throwError(`Invoice item ${itemId} not found on this invoice.`, 404);
          if (line.refundedQuantity >= line.quantity) {
            throwError(`Invoice item ${itemId} has already been refunded.`, 409);
          }
          selectedLines.push(line);
        }

        if (settings.allowPartialReturn === false && selectedLines.length !== invoice.items.length) {
          throwError("Partial returns are disabled for this brand/branch — the entire invoice must be returned (SalesReturnSettings.allowPartialReturn).", 403);
        }

        // Atomic claim: guards the same race Payment guards on Invoice.balanceDue — only lines
        // still at refundedQuantity:0 get claimed; any concurrent winner on an overlapping subset
        // means the counts below won't match, which aborts this whole transaction (all writes so
        // far, including the SalesReturn doc created below, roll back together).
        const selectedIds = selectedLines.map((l) => l._id);
        await InvoiceModel.updateOne(
          { _id: invoiceId, brand, branch },
          { $inc: { "items.$[elem].refundedQuantity": 1 } },
          { arrayFilters: [{ "elem._id": { $in: selectedIds }, "elem.refundedQuantity": 0 }], session },
        );
        const reclaimed = await InvoiceModel.findOne({ _id: invoiceId, brand, branch }).session(session).select("items").lean();
        const claimedOk = selectedIds.every((id) => reclaimed.items.find((i) => String(i._id) === String(id))?.refundedQuantity === 1);
        if (!claimedOk) {
          throwError("One or more selected items were concurrently claimed by another refund request — reload and retry.", 409);
        }

        const returnItems = selectedLines.map((line) => ({
          originalInvoiceItemId: line._id,
          product: line.product,
          quantity: line.quantity,
          price: line.price,
          priceAfterDiscount: line.priceAfterDiscount,
          totalprice: line.totalprice,
          extras: line.extras,
          totalExtrasPrice: line.totalExtrasPrice,
        }));

        const subtotal = round2(returnItems.reduce((sum, i) => sum + i.totalprice + (i.totalExtrasPrice || 0), 0));
        const ratio = invoice.subtotal > 0 ? subtotal / invoice.subtotal : 0;
        // Each reversible component is computed proportionally to the returned share of the
        // invoice, and ZEROED (not just skipped from GL posting) when its settings toggle is off —
        // `doc.total` must reflect exactly what this brand's policy actually gives back, not the
        // full mathematical reversal, so Step A's lines (built from these same fields) are
        // guaranteed balanced by construction, never computed separately and hoping they agree.
        const salesTax = settings.refundTaxes !== false ? round2(invoice.salesTax * ratio) : 0;
        const serviceTax = settings.refundServiceCharge !== false ? round2(invoice.serviceTax * ratio) : 0;
        const deliveryFee = settings.refundDeliveryFee === true ? round2((invoice.deliveryFee || 0) * ratio) : 0;
        const discount = round2((invoice.discount || 0) * ratio);
        const total = round2(subtotal + salesTax + serviceTax + deliveryFee - discount);
        const returnType = selectedLines.length === invoice.items.length ? "FULL" : "PARTIAL";

        const serial = await salesReturnSettingsService.getNextReturnSerial(brand, branch, session);
        const requiresApproval = settings.requireManagerApproval !== false && total > (settings.approvalThresholdAmount || 0);

        const [doc] = await this.model.create(
          [{
            brand, branch, serial, originalInvoice: invoiceId, order,
            items: returnItems, subtotal, salesTax, serviceTax, deliveryFee, discount, addition: 0, total,
            returnType, reason: reason || "",
            refundStatus: requiresApproval ? "PENDING_APPROVAL" : "APPROVED",
            approvedBy: requiresApproval ? null : actorId,
            approvedAt: requiresApproval ? null : new Date(),
            // Omitted entirely (not set to null) when absent — see the model's own comment on why
            // that's what makes the sparse unique index actually behave as sparse.
            ...(idempotencyKey ? { idempotencyKey } : {}),
          }],
          { session },
        );

        if (!requiresApproval) {
          await this._runStepAAndMaybeB({ session, brand, branch, invoice, doc, settings, refundMethod, actorId });
        }

        return { doc, freshlyCreated: true };
      });

      // Orchestration happens AFTER commit, and only for a freshly-created, already-approved
      // document — never nested inside the transaction above, and never repeated on an idempotent
      // replay (§ orchestratePreparationReturns's own doc comment).
      if (freshlyCreated && doc.refundStatus !== "PENDING_APPROVAL") {
        await this.orchestratePreparationReturns({ salesReturn: doc, actorId });
      }
      return doc;
    } catch (err) {
      if (idempotencyKey && err.code === 11000) {
        const existing = await this.model.findOne({ brand, originalInvoice: invoiceId, idempotencyKey }).lean();
        if (existing) return existing;
      }
      throw err;
    }
  }

  /** Authorization check + PENDING_APPROVAL -> APPROVED, then Step A (+ Step B if refundMethod
   * supplied at approval time) — its own transaction, since requestRefund's transaction already
   * ended when it left the document PENDING_APPROVAL. */
  async approve({ id, brand, branch, refundMethod, actorId }) {
    const doc = await this.model.findOne({ _id: id, brand, branch });
    if (!doc) throwError("Sales return not found.", 404);
    if (doc.refundStatus !== "PENDING_APPROVAL") {
      throwError(`Only a PENDING_APPROVAL return can be approved (current status: ${doc.refundStatus}).`, 409);
    }

    const settings = await salesReturnSettingsService.resolveForBranch(brand, branch);
    if (!settings) throwError("No SalesReturnSettings configured for this brand/branch.", 422);

    const authorized = await isAuthorizedByJobTitle(actorId, settings.decisionBy);
    if (!authorized) {
      throwError("The approving user's job title is not authorized to approve refunds for this brand/branch (SalesReturnSettings.decisionBy).", 403);
    }

    const claimed = await this.model.findOneAndUpdate(
      { _id: id, brand, branch, refundStatus: "PENDING_APPROVAL" },
      { $set: { refundStatus: "APPROVED", approvedBy: actorId, approvedAt: new Date() } },
      { new: true },
    );
    if (!claimed) {
      throwError("This return was already decided by a concurrent request.", 409);
    }

    const posted = await this.withTransaction(async (session) => {
      const invoice = await InvoiceModel.findOne({ _id: claimed.originalInvoice, brand, branch }).session(session);
      if (!invoice) throwError("Original invoice not found.", 404);
      await this._runStepAAndMaybeB({ session, brand, branch, invoice, doc: claimed, settings, refundMethod, actorId });
      return this.model.findById(claimed._id).session(session);
    });

    // Orchestration happens AFTER commit, its own separate write — never nested inside the
    // transaction above (§ orchestratePreparationReturns's own doc comment).
    await this.orchestratePreparationReturns({ salesReturn: posted, actorId });
    return posted;
  }

  async reject({ id, brand, branch, actorId, reason }) {
    const doc = await this.model.findOne({ _id: id, brand, branch });
    if (!doc) throwError("Sales return not found.", 404);
    if (doc.refundStatus !== "PENDING_APPROVAL") {
      throwError(`Only a PENDING_APPROVAL return can be rejected (current status: ${doc.refundStatus}).`, 409);
    }

    const settings = await salesReturnSettingsService.resolveForBranch(brand, branch);
    const authorized = settings && await isAuthorizedByJobTitle(actorId, settings.decisionBy);
    if (!authorized) {
      throwError("The rejecting user's job title is not authorized to decide refunds for this brand/branch (SalesReturnSettings.decisionBy).", 403);
    }

    // Release the claim §"atomic claim" placed on the invoice's lines — a rejected request never
    // consumed any real refund, so the lines it selected must become refundable again.
    const claimed = await this.model.findOneAndUpdate(
      { _id: id, brand, branch, refundStatus: "PENDING_APPROVAL" },
      { $set: { refundStatus: "REJECTED", rejectedBy: actorId, rejectedAt: new Date(), rejectionReason: reason || null } },
      { new: true },
    );
    if (!claimed) throwError("This return was already decided by a concurrent request.", 409);

    const itemIds = claimed.items.map((i) => i.originalInvoiceItemId);
    await InvoiceModel.updateOne(
      { _id: claimed.originalInvoice, brand, branch },
      { $inc: { "items.$[elem].refundedQuantity": -1 } },
      { arrayFilters: [{ "elem._id": { $in: itemIds } }] },
    );

    return claimed;
  }

  /** Step B only — for the case where Step A already posted (APPROVED/PARTIALLY_REFUNDED) and
   * settlement trails approval, mirroring PurchaseReturn.recordRefund() being a separate call from
   * .approve(). Settles the full remaining `doc.total` in one call. */
  async settleRefund({ id, brand, branch, refundMethod, actorId }) {
    const doc = await this.model.findOne({ _id: id, brand, branch });
    if (!doc) throwError("Sales return not found.", 404);
    if (!["APPROVED", "PARTIALLY_REFUNDED"].includes(doc.refundStatus)) {
      throwError(`Only an APPROVED or PARTIALLY_REFUNDED return can be settled (current status: ${doc.refundStatus}).`, 409);
    }
    if (doc.reversalOfJournalEntry) {
      throwError("This return has already been settled.", 409);
    }

    const settings = await salesReturnSettingsService.resolveForBranch(brand, branch);
    if (!settings) throwError("No SalesReturnSettings configured for this brand/branch.", 422);

    return this.withTransaction(async (session) => {
      await this._postStepB({ session, brand, branch, doc, settings, refundMethod, actorId });
      const claimed = await this.model.findOneAndUpdate(
        { _id: id, brand, branch },
        { $set: { refundStatus: "FULLY_REFUNDED" } },
        { new: true, session },
      );
      return claimed;
    });
  }

  /** Runs Step A always; Step B too when `refundMethod` was supplied (same-visit settlement) —
   * both inside the caller's transaction. */
  async _runStepAAndMaybeB({ session, brand, branch, invoice, doc, settings, refundMethod, actorId }) {
    await this._postStepA({ session, brand, branch, invoice, doc, settings, actorId });

    let finalStatus = "PARTIALLY_REFUNDED";
    if (Array.isArray(refundMethod) && refundMethod.length > 0) {
      await this._postStepB({ session, brand, branch, doc, settings, refundMethod, actorId });
      finalStatus = "FULLY_REFUNDED";
    }

    await this.model.updateOne({ _id: doc._id }, { $set: { refundStatus: finalStatus } }, { session });
    doc.refundStatus = finalStatus;
  }

  /** Step A — SALES_RETURN posting: revenue/tax/serviceCharge/deliveryFee reversal (each
   * conditional per settings, already baked into doc's own stored amounts), credit AR. Goods
   * physically restored to inventory is NOT this method's job — that is PreparationReturn's own,
   * separately-timed transaction (§13.1 revision, ADR-001 Phase 2 architecture decision). */
  async _postStepA({ session, brand, branch, invoice, doc, settings, actorId }) {
    if (settings.generateAccountingEntry === false) return;

    const accSettings = await accountingSettingService.resolveForPosting(brand, branch, session);
    const currency = accSettings.currencySettings?.baseCurrency || "EGP";
    const activities = accSettings.activities?.salesReturn || {};
    const accountsReceivable = accSettings.controlAccounts?.accountsReceivable;
    if (!activities.revenueContra || !accountsReceivable) {
      throwError("AccountingSettings.activities.salesReturn/controlAccounts.accountsReceivable is not fully configured — cannot post this refund.", 422);
    }

    const description = `Sales Return ${doc.serial} (Invoice ${invoice.serial})`;
    const debitLines = [journalLine(activities.revenueContra, description, doc.subtotal, 0, currency)];
    if (doc.salesTax > 0) {
      if (!activities.taxContra) throwError("AccountingSettings.activities.salesReturn.taxContra is not configured.", 422);
      debitLines.push(journalLine(activities.taxContra, description, doc.salesTax, 0, currency));
    }
    if (doc.serviceTax > 0) {
      if (!activities.serviceChargeContra) throwError("AccountingSettings.activities.salesReturn.serviceChargeContra is not configured.", 422);
      debitLines.push(journalLine(activities.serviceChargeContra, description, doc.serviceTax, 0, currency));
    }
    if (doc.deliveryFee > 0) {
      if (!activities.deliveryFeeContra) throwError("AccountingSettings.activities.salesReturn.deliveryFeeContra is not configured.", 422);
      debitLines.push(journalLine(activities.deliveryFeeContra, description, doc.deliveryFee, 0, currency));
    }

    const creditLines = [journalLine(accountsReceivable, description, 0, doc.total, currency)];
    if (doc.discount > 0) {
      if (!activities.discountContra) throwError("AccountingSettings.activities.salesReturn.discountContra is not configured.", 422);
      creditLines.push(journalLine(activities.discountContra, description, 0, doc.discount, currency));
    }

    const { entry } = await journalEntryService.postFromSource({
      sourceType: "SALES_RETURN",
      brand, branch,
      date: new Date(),
      description,
      lines: [...debitLines, ...creditLines],
      createdBy: actorId,
      sourceRef: doc._id,
      session,
    });

    await this.model.updateOne({ _id: doc._id }, { $set: { journalEntry: entry._id } }, { session });
    doc.journalEntry = entry._id;
  }

  /** Step B — SALES_REFUND posting: debit AR (draws down what Step A just credited), credit
   * cash/card per resolved account (split-tender safe — one line per distinct account, reusing
   * Payment's own per-tender grouping fix, never the collapsing bug it fixed) + one
   * CashTransaction{REFUND,OUTFLOW} per tender, attributed to the CURRENT open shift (never the
   * original sale's, possibly now-closed, shift). */
  async _postStepB({ session, brand, branch, doc, settings, refundMethod, actorId }) {
    if (!Array.isArray(refundMethod) || refundMethod.length === 0) {
      throwError("At least one refund method/tender is required to settle this refund.", 400);
    }
    const tenderTotal = round2(refundMethod.reduce((sum, t) => sum + (t.amount || 0), 0));
    if (tenderTotal !== doc.total) {
      throwError(`Refund method total (${tenderTotal}) must equal the return's total (${doc.total}).`, 400);
    }

    const cashTransactionIds = [];
    if (settings.generateAccountingEntry !== false) {
      const accSettings = await accountingSettingService.resolveForPosting(brand, branch, session);
      const currency = accSettings.currencySettings?.baseCurrency || "EGP";
      const accountsReceivable = accSettings.controlAccounts?.accountsReceivable;
      if (!accountsReceivable) {
        throwError("AccountingSettings.controlAccounts.accountsReceivable is not configured — cannot post this refund's settlement.", 422);
      }
      const description = `Refund settlement for Sales Return ${doc.serial}`;

      const amountByAccount = new Map();
      for (const tender of refundMethod) {
        const account = await this._resolveCashAccount(tender, accSettings, brand, branch, session);
        if (!account) {
          throwError("No cash/card GL account could be resolved for one of this refund's tenders.", 422);
        }
        const key = account.toString();
        amountByAccount.set(key, (amountByAccount.get(key) || 0) + (tender.amount || 0));
      }

      const lines = [
        journalLine(accountsReceivable, description, tenderTotal, 0, currency),
        ...Array.from(amountByAccount, ([account, amount]) => journalLine(account, description, 0, amount, currency)),
      ];

      const { entry } = await journalEntryService.postFromSource({
        sourceType: "SALES_REFUND",
        brand, branch,
        date: new Date(),
        description,
        lines,
        createdBy: actorId,
        sourceRef: doc._id,
        session,
      });

      await this.model.updateOne({ _id: doc._id }, { $set: { reversalOfJournalEntry: entry._id } }, { session });
      doc.reversalOfJournalEntry = entry._id;
    }

    for (const tender of refundMethod) {
      const number = await cashierShiftSettingsService.getNextTransactionNumber(brand, branch, session);
      const cashTx = await cashTransactionService.create({
        brandId: brand,
        branchId: branch,
        createdBy: actorId,
        data: {
          branch,
          number,
          date: new Date(),
          transactionType: "REFUND",
          direction: "OUTFLOW",
          amount: tender.amount,
          currency: tender.currency || "EGP",
          paymentMethod: tender.method,
          cashRegister: tender.cashRegister || null,
          status: "POSTED",
          postedAt: new Date(),
          description: `Refund for Sales Return ${doc.serial}`,
        },
        session,
      });
      cashTransactionIds.push(cashTx._id);
    }

    await this.model.updateOne(
      { _id: doc._id },
      { $set: { refundMethod, paidBy: actorId } },
      { session },
    );
  }

  /** Same fallback resolution PaymentService._resolveCashAccount()/PurchaseInvoice's own use —
   * duplicated (not imported) since it's a private, class-bound method there; the shape is a
   * platform-wide convention, not Payment-specific business logic. */
  async _resolveCashAccount(tender, settings, brand, branch, session) {
    if (tender.cashRegister) {
      const register = await CashRegisterModel.findOne({ _id: tender.cashRegister, brand, $or: [{ branch: null }, { branch }] })
        .session(session)
        .select("accountId")
        .lean();
      if (register?.accountId) return register.accountId;
    }
    return settings.controlAccounts?.cash;
  }

  /**
   * Orchestrates PreparationReturn ticket creation — one per distinct `preparationSection` among
   * the refunded items that were ever sent to the kitchen (a Product with no `preparationSection`
   * is a money-only/service-recovery line, skipped here). Deliberately called AFTER SalesReturn's
   * own transaction has already committed (never nested inside it) — PreparationReturn is a
   * separate Aggregate Root in a separate bounded context with its own, later finalization timing,
   * exactly mirroring how `order.service.js#createTicketsFromOrder` is a distinct step after Order
   * confirmation, not part of Order's own transaction. Every item's `decision` is seeded to
   * "WASTE" — the safe, conservative default (never assume something is resellable without
   * inspection) — kitchen staff are expected to correct it via PreparationReturn's own `update()`
   * while the ticket is IN_REVIEW, before `finalize()` locks it in and posts inventory.
   */
  async orchestratePreparationReturns({ salesReturn, actorId }) {
    const productIds = [...new Set(salesReturn.items.map((i) => String(i.product)))];
    const products = await ProductModel.find({ _id: { $in: productIds } }).select("preparationSection").lean();
    const sectionByProduct = Object.fromEntries(
      products.map((p) => [String(p._id), p.preparationSection ? String(p.preparationSection) : null]),
    );

    const itemsBySection = {};
    for (const item of salesReturn.items) {
      const sectionId = sectionByProduct[String(item.product)];
      if (!sectionId) continue; // money-only/service-recovery line — no kitchen disposition to decide
      itemsBySection[sectionId] = itemsBySection[sectionId] || [];
      itemsBySection[sectionId].push(item);
    }

    const sectionIds = Object.keys(itemsBySection);
    if (sectionIds.length === 0) return [];

    const now = new Date();
    const tickets = [];
    let ticketNumber = 0;
    for (const sectionId of sectionIds) {
      ticketNumber += 1;
      const ticket = await PreparationReturnModel.create({
        brand: salesReturn.brand,
        branch: salesReturn.branch,
        ticketNumber,
        returnInvoice: salesReturn._id,
        preparationSection: sectionId,
        items: itemsBySection[sectionId].map((item) => ({
          orderItemId: item.originalInvoiceItemId,
          product: item.product,
          quantity: item.quantity,
          extras: item.extras,
          decision: "WASTE",
        })),
        receivedAt: now,
        expectedReadyAt: new Date(now.getTime() + 30 * 60000),
        createdBy: actorId,
      });
      tickets.push(ticket);
    }
    return tickets;
  }
}

export default new SalesReturnService();
