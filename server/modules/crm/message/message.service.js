import MessageModel from "./message.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";

// Initialize service for message model
const messageService = new AdvancedService(MessageModel, {
  brandScoped: true,
  enableSoftDelete: true,
  defaultPopulate: ["brand","branch","order","assignedTo","resolvedBy","deletedBy"],
  searchableFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default messageService;
