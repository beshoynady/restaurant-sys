import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import ReservationModel from "../../models/seating\reservation.model.js";

/* =========================
   Create Schema
========================= */
export const createReservationSchema = buildJoiSchema(ReservationModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updateReservationSchema = (function() {
  const schema = buildJoiSchema(ReservationModel.schema);
  return schema.fork(Object.keys(ReservationModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const reservationParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const reservationQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});