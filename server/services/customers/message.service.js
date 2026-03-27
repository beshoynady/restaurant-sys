import MessageModel from "../../models/customers/message.model.js";
import AdvancedCrudService from "../AdvancedCrudService.js";

// Initialize service for message model
const messageService = new AdvancedCrudService(MessageModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","order","assignedTo","resolvedBy","deletedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default messageService;
