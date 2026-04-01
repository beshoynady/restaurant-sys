import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
import ReservationModel from "../../models/seating/reservation.model.js";

/* =========================
   Create Schema
========================= */
export const createReservationSchema = createSchema(ReservationModel.schema);

/* =========================
   Update Schema
========================= */
export const updateReservationSchema = updateSchema(
  ReservationModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const reservationParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const reservationQuerySchema = querySchema();