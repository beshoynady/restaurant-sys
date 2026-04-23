import PaymentMethodModel from "./payment-method.model.js";
import AdvancedService from "../../../utils/AdvancedService.js";

// Initialize service for payment-method model
const paymentMethodService = new AdvancedService(PaymentMethodModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","createdBy","updatedBy","deletedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default paymentMethodService;
