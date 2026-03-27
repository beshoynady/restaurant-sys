import PaymentMethodModel from "../../models/payments/payment-method.model.js";
import AdvancedCrudService from "../AdvancedCrudService.js";

// Initialize service for payment-method model
const paymentMethodService = new AdvancedCrudService(PaymentMethodModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","createdBy","updatedBy","deletedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default paymentMethodService;
