import ReservationModel from "./reservation.model.js";
import AdvancedService from "../../utils/AdvancedService.js";

// Initialize service for reservation model
const reservationService = new AdvancedService(ReservationModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","table","customer","user","linkedOrder","createdBy","updatedBy","cancelledBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default reservationService;
