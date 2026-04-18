import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../utils/joiFactory.js";
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
export const paramsReservationSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsReservationIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryReservationSchema = querySchema();