import express from "express";
import deviceController from "./device.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import validate from "../../../middlewares/validate.js";
import { paramsDeviceSchema, blockDeviceSchema, renameDeviceSchema, paramsUserDevicesSchema } from "./device.validation.js";

const router = express.Router();

router.get(
  "/user/:userId",
  authenticateToken,
  authorize("Devices", "read"),
  validate(paramsUserDevicesSchema, "params"),
  deviceController.listForUser,
);

router.patch(
  "/:id/trust",
  authenticateToken,
  authorize("Devices", "update"),
  validate(paramsDeviceSchema, "params"),
  deviceController.trust,
);

router.patch(
  "/:id/block",
  authenticateToken,
  authorize("Devices", "update"),
  validate(paramsDeviceSchema, "params"),
  validate(blockDeviceSchema),
  deviceController.block,
);

router.patch(
  "/:id/rename",
  authenticateToken,
  authorize("Devices", "update"),
  validate(paramsDeviceSchema, "params"),
  validate(renameDeviceSchema),
  deviceController.rename,
);

export default router;
