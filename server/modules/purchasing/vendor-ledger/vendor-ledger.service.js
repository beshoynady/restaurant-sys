import SupplierTransactionModel from "../supplier-transaction/supplier-transaction.model.js";
import PurchaseInvoiceModel from "../purchase-invoice/purchase-invoice.model.js";
import SupplierModel from "../supplier/supplier.model.js";

/**
 * Vendor Accounting Platform — Supply Chain & Commerce Platform V5.1
 * (SUPPLY_CHAIN_SSOT_MATRIX.md: SupplierTransaction is the sole SSOT for the AP subledger;
 * PurchaseInvoice.balanceDue is the SSOT for one invoice's own remaining balance).
 *
 * Entirely read-side — every method here queries the two existing SSOTs and computes a report; it
 * writes nothing and stores nothing, exactly like the Three-Way Matching Engine and for the same
 * reason (a cached "vendor statement" or "aging report" document would immediately become a
 * second, driftable place the same facts live). Only imports the two Mongoose MODELS (not their
 * services), avoiding a circular service-to-service dependency — `purchase-invoice.service.js`
 * already depends on `supplier-transaction.service.js`.
 */
class VendorLedgerService {
  /** The full chronological transaction history for one supplier — a "vendor statement." */
  async getVendorStatement({ brand, supplier, from = null, to = null }) {
    const query = { brand, supplier };
    if (from || to) {
      query.transactionDate = {};
      if (from) query.transactionDate.$gte = from;
      if (to) query.transactionDate.$lte = to;
    }

    const transactions = await SupplierTransactionModel.find(query)
      .sort({ transactionDate: 1, number: 1 })
      .populate("paymentMethod recordedBy")
      .lean();

    const openingBalance = transactions.length ? transactions[0].previousBalance : 0;
    const closingBalance = transactions.length ? transactions[transactions.length - 1].currentBalance : openingBalance;

    return { supplier, from, to, openingBalance, closingBalance, transactions };
  }

  /** Every PurchaseInvoice with a remaining balance — the raw open-payables list. */
  async getOpenPayables({ brand, branch = null, supplier = null }) {
    const query = { brand, status: "Completed", balanceDue: { $gt: 0 } };
    if (branch) query.branch = branch;
    if (supplier) query.supplier = supplier;

    return PurchaseInvoiceModel.find(query)
      .select("invoiceNumber supplier invoiceDate paymentDueDate netAmount balanceDue")
      .populate("supplier", "name code")
      .sort({ paymentDueDate: 1 })
      .lean();
  }

  /**
   * Standard AP aging buckets (Current / 1-30 / 31-60 / 61-90 / 90+), computed from each open
   * invoice's `paymentDueDate` against `asOfDate` — the same open-payables list `getOpenPayables`
   * returns, just bucketed. An invoice with no `paymentDueDate` set is bucketed as Current (no
   * evidence it's actually overdue).
   */
  async getAgingAnalysis({ brand, branch = null, supplier = null, asOfDate = new Date() }) {
    const openInvoices = await this.getOpenPayables({ brand, branch, supplier });

    const buckets = { current: 0, days1to30: 0, days31to60: 0, days61to90: 0, days90plus: 0 };
    const bucketedInvoices = [];

    for (const invoice of openInvoices) {
      const daysOverdue = invoice.paymentDueDate
        ? Math.floor((asOfDate.getTime() - new Date(invoice.paymentDueDate).getTime()) / (24 * 60 * 60 * 1000))
        : -1;

      let bucket;
      if (daysOverdue <= 0) bucket = "current";
      else if (daysOverdue <= 30) bucket = "days1to30";
      else if (daysOverdue <= 60) bucket = "days31to60";
      else if (daysOverdue <= 90) bucket = "days61to90";
      else bucket = "days90plus";

      buckets[bucket] += invoice.balanceDue;
      bucketedInvoices.push({ ...invoice, daysOverdue: Math.max(daysOverdue, 0), bucket });
    }

    return { asOfDate, buckets, totalOutstanding: Object.values(buckets).reduce((a, b) => a + b, 0), invoices: bucketedInvoices };
  }

  /**
   * Supplier Balance Reconciliation — cross-checks the AP subledger's own running balance
   * (SupplierTransaction.currentBalance, the SSOT) against an independent re-derivation
   * (sum of every open PurchaseInvoice.balanceDue for the same supplier). These SHOULD always
   * agree if every Purchase/Payment/Return was correctly recorded through the ledger; a mismatch
   * is a real data-integrity signal, not a normal outcome — this method exists to surface that,
   * not to correct it silently.
   */
  async reconcileSupplierBalance({ brand, supplier }) {
    const ledgerBalance = await this._getLedgerBalance(brand, supplier);
    const openInvoices = await this.getOpenPayables({ brand, supplier });
    const invoiceDerivedBalance = openInvoices.reduce((sum, inv) => sum + inv.balanceDue, 0);

    return {
      supplier,
      ledgerBalance,
      invoiceDerivedBalance,
      reconciled: Math.abs(ledgerBalance - invoiceDerivedBalance) < 0.01,
      difference: Number((ledgerBalance - invoiceDerivedBalance).toFixed(2)),
    };
  }

  async _getLedgerBalance(brand, supplier) {
    const lastTxn = await SupplierTransactionModel.findOne({ brand, supplier }).sort({ createdAt: -1 }).select("currentBalance").lean();
    return lastTxn?.currentBalance ?? 0;
  }

  /** Credit Limit Monitoring — how much of the supplier's approved credit limit is currently used. */
  async getCreditLimitStatus({ brand, supplier }) {
    const supplierDoc = await SupplierModel.findOne({ _id: supplier, brand }).select("creditLimit paymentType").lean();
    const currentBalance = await this._getLedgerBalance(brand, supplier);
    const creditLimit = supplierDoc?.creditLimit || 0;

    return {
      supplier,
      creditLimit,
      currentBalance,
      availableCredit: creditLimit > 0 ? Math.max(creditLimit - currentBalance, 0) : null,
      utilizationPct: creditLimit > 0 ? Number(((currentBalance / creditLimit) * 100).toFixed(2)) : null,
      overLimit: creditLimit > 0 && currentBalance > creditLimit,
    };
  }
}

export default new VendorLedgerService();
