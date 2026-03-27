import PaymentChannelModel from "../../models/payments/payment-channel.model.js";
import AdvancedCrudService from "../AdvancedCrudService.js";

// Initialize service for payment-channel model
const paymentChannelService = new AdvancedCrudService(PaymentChannelModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","clearingAccount","settlementAccount","feeAccount","createdBy","updatedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default paymentChannelService;
