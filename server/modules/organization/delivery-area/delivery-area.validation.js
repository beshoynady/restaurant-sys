import Joi from "joi";
import {
  createSchema,
  updateSchema,
  paramsSchema,
  paramsIdsSchema,
  querySchema,
} from "../../../utils/joiFactory.js";
import DeliveryAreaModel from "./delivery-area.model.js";

// GeoJSON position: [longitude, latitude] — that exact order, the #1
// source of silent point-in-polygon bugs. `.ordered()` binds each array
// slot to its own range instead of treating both slots as interchangeable.
const positionSchema = Joi.array()
  .ordered(
    Joi.number().min(-180).max(180).required(),
    Joi.number().min(-90).max(90).required(),
  )
  .length(2);

// A GeoJSON linear ring: >=4 positions, first === last (closed). Previously
// unvalidated at the Joi layer entirely (joiFactory's generic array-caster
// handling doesn't recurse into triple-nested arrays), so a malformed or
// unclosed ring only ever failed later, inside Mongoose/MongoDB, with a far
// less clear error.
const ringSchema = Joi.array()
  .items(positionSchema)
  .min(4)
  .custom((ring, helpers) => {
    const [firstLng, firstLat] = ring[0];
    const [lastLng, lastLat] = ring[ring.length - 1];

    if (firstLng !== lastLng || firstLat !== lastLat) {
      return helpers.error("ring.notClosed");
    }

    return ring;
  }, "closed-ring validation")
  .messages({
    "ring.notClosed": "Polygon ring must be closed (first and last coordinates must match)",
  });

const coverageAreaSchema = (required) => {
  let schema = Joi.object({
    type: Joi.string().valid("Polygon").default("Polygon"),
    coordinates: Joi.array().items(ringSchema).min(1).required(),
  });

  return required ? schema.required() : schema.optional();
};

export const createDeliveryAreaSchema = createSchema(DeliveryAreaModel.schema).keys({
  coverageArea: coverageAreaSchema(true),
});

export const updateDeliveryAreaSchema = updateSchema(DeliveryAreaModel.schema, {
  exclude: ["updatedBy"],
}).keys({
  coverageArea: coverageAreaSchema(false),
});

export const paramsDeliveryAreaSchema = paramsSchema();
export const paramsDeliveryAreaIdsSchema = paramsIdsSchema();
export const queryDeliveryAreaSchema = querySchema();

// Point-in-polygon resolver query params (?lat=&lng=) — see
// delivery-area.service.js#resolveAreaForPoint.
export const resolveAreaQuerySchema = Joi.object({
  lat: Joi.number().min(-90).max(90).required(),
  lng: Joi.number().min(-180).max(180).required(),
});
