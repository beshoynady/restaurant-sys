import MessageModel from "./message.model.js";
import AdvancedService from "../../../utils/AdvancedService.js";

// Initialize service for message model
const messageService = new AdvancedService(MessageModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","order","assignedTo","resolvedBy","deletedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default messageService;
