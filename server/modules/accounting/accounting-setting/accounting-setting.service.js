import AccountingSettingModel from "./accounting-setting.model.js";
import AdvancedService from "../../utils/AdvancedService.js";

// Initialize service for accounting-setting model
const accountingSettingService = new AdvancedService(AccountingSettingModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","controlAccounts.cash","controlAccounts.bank","controlAccounts.accountsReceivable","controlAccounts.accountsPayable","controlAccounts.inventory","controlAccounts.inventoryAdjustment","controlAccounts.costOfGoodsSold","controlAccounts.operatingExpense","controlAccounts.salesTaxPayable","controlAccounts.purchaseTaxRecoverable","controlAccounts.equityCapital","controlAccounts.retainedEarnings","activities.sales.revenue","activities.sales.tax","activities.sales.discount","activities.sales.serviceCharge","activities.sales.deliveryFee","activities.sales.costOfSales","activities.salesReturn.revenueContra","activities.salesReturn.discountContra","activities.salesReturn.serviceChargeContra","activities.salesReturn.deliveryFeeContra","activities.salesReturn.costOfSalesContra","activities.salesReturn.taxContra","activities.purchase.inventory","activities.purchase.tax","activities.purchase.discount","activities.purchaseReturn.inventoryContra","activities.purchaseReturn.taxContra","activities.expense.defaultExpense","activities.expense.tax","costCenter.defaultCostCenter","createdBy","updatedBy","deletedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default accountingSettingService;
