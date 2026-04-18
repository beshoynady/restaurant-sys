// routes/customers/online-customer.routes.js

import express from "express";
import onlineCustomerController from "../../controllers/customers/online-customer.controller.js";
import authenticateCustomer from "../../middlewares/authenticate-customer.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import authorize from "../../middlewares/authorize.js";

import {
  createOnlineCustomerSchema,
  updateOnlineCustomerSchema,
  paramsOnlineCustomerSchema,
  paramsOnlineCustomerIdsSchema,
  queryOnlineCustomerSchema,
} from "../../validation/customers/online-customer.validation.js";

const router = express.Router();

/**
 * 🔹 Inject config
 */
const customerConfig = (req, res, next) => {
  req.populate = ["brand", "verifiedBy", "favorites"];
  next();
};

// =====================================================
// CRUD
// =====================================================

router.route("/")
  .post(
    authenticateToken,
    customerConfig,
    validate(createOnlineCustomerSchema),
    onlineCustomerController.create
  )
  .get(
    authenticateToken,
    customerConfig,
    validate(queryOnlineCustomerSchema),
    onlineCustomerController.getAll
  );

router.route("customer/:id")
  .get(
    authenticateCustomer,
    customerConfig,
    validate(paramsOnlineCustomerSchema),
    onlineCustomerController.getOne
  )
  router.route("admin/:id")

.get(
    authenticateToken,
    customerConfig,
    validate(paramsOnlineCustomerSchema),
    onlineCustomerController.getOne
  )
  .put(
    authenticateToken,
    customerConfig,
    validate(updateOnlineCustomerSchema),
    onlineCustomerController.update
  )
  .delete(
    authenticateToken,
    validate(paramsOnlineCustomerSchema),
    onlineCustomerController.hardDelete
  );

// =====================================================
// Soft Delete
// =====================================================

router.patch(
  "/soft-delete/:id",
  authenticateToken,
  validate(paramsOnlineCustomerSchema),
  onlineCustomerController.softDelete
);

router.patch(
  "/restore/:id",
  authenticateToken,
  validate(paramsOnlineCustomerSchema),
  onlineCustomerController.restore
);

// =====================================================
// Bulk
// =====================================================

router.delete(
  "/bulk-delete",
  authenticateToken,
  validate(paramsOnlineCustomerIdsSchema),
  onlineCustomerController.bulkHardDelete
);

router.patch(
  "/bulk-soft-delete",
  authenticateToken,
  validate(paramsOnlineCustomerIdsSchema),
  onlineCustomerController.bulkSoftDelete
);

// =====================================================
// Business Logic
// =====================================================

router.patch(
  "/:id/add-points",
  authenticateToken,
  onlineCustomerController.addPoints
);

router.patch(
  "/:id/recalc-tier",
  authenticateToken,
  onlineCustomerController.recalcTier
);

router.patch(
  "/:id/set-default-address",
  authenticateToken,
  onlineCustomerController.setDefaultAddress
);

export default router;