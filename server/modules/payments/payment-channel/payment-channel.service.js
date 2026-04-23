import PaymentChannelModel from "./payment-channel.model.js";
import AdvancedService from "../../../utils/AdvancedService.js";

// Initialize service for payment-channel model
const paymentChannelService = new AdvancedService(PaymentChannelModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","clearingAccount","settlementAccount","feeAccount","createdBy","updatedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default paymentChannelService;
