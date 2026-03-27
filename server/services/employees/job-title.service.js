import JobTitleModel from "../../models/employees/job-title.model.js";
import AdvancedCrudService from "../AdvancedCrudService.js";

// Initialize service for job-title model
const jobTitleService = new AdvancedCrudService(JobTitleModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","department","createdBy","updatedBy","deletedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default jobTitleService;
