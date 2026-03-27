import ReservationModel from "../../models/seating/reservation.model.js";
import AdvancedCrudService from "../AdvancedCrudService.js";

// Initialize service for reservation model
const reservationService = new AdvancedCrudService(ReservationModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","table","customer","user","linkedOrder","createdBy","updatedBy","cancelledBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default reservationService;
