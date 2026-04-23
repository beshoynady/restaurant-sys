import JobTitleModel from "./job-title.model.js";
import AdvancedService from "../../utils/AdvancedService.js";

// Initialize service for job-title model
const jobTitleService = new AdvancedService(JobTitleModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","department","createdBy","updatedBy","deletedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default jobTitleService;
